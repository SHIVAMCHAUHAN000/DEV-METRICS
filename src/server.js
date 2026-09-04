import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import axios from 'axios';
import NodeCache from 'node-cache';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Check environment variables without crashing serverless boots
const requiredEnv = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL', 'SESSION_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn('⚠️ Missing environment variables:', missing.join(', '));
  console.warn('Set these in your Vercel project settings to enable GitHub OAuth.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();
const port = process.env.PORT || 5001;

// Cache setup (5 minute TTL)
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 300 });

// Cache statistics
const cacheStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCallsMade: 0,
  timeSaved: 0
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(publicDir));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub strategy (only initialized if credentials exist)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5001/auth/github/callback'
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
  ));
} else {
  console.warn('⚠️ GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set in environment variables.');
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

app.get('/auth/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).send('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL in your Vercel project environment variables.');
  }
  passport.authenticate('github', { scope: ['user:email', 'repo'] })(req, res, next);
});

app.get('/auth/github/callback', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.redirect('/');
  }
  passport.authenticate('github', { failureRedirect: '/' })(req, res, () => {
    res.redirect('/dashboard');
  });
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.redirect('/');
  });
});

// Get user data (authenticated)
app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    username: req.user.username,
    avatar: req.user.photos?.[0]?.value,
    name: req.user.displayName
  });
});

// Get repository metrics with caching
app.post('/api/repo-metrics', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { owner, repo } = req.body;
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  const cacheKey = `${owner}/${repo}`;
  cacheStats.totalRequests++;

  // Check cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheStats.cacheHits++;
    return res.json({
      ...cachedData,
      fromCache: true,
      cacheHits: cacheStats.cacheHits,
      cacheMisses: cacheStats.cacheMisses
    });
  }

  cacheStats.cacheMisses++;

  try {
    const startTime = Date.now();
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${req.user.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    cacheStats.apiCallsMade++;
    const apiTime = Date.now() - startTime;

    const metrics = {
      name: response.data.name,
      owner: response.data.owner?.login,
      url: response.data.html_url,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      issues: response.data.open_issues_count,
      watchers: response.data.watchers_count,
      language: response.data.language,
      lastUpdate: response.data.updated_at,
      description: response.data.description,
      apiResponseTime: apiTime,
      cachedAt: new Date().toISOString()
    };

    // Store in cache
    cache.set(cacheKey, metrics);
    cacheStats.timeSaved += 0;

    res.json({
      ...metrics,
      fromCache: false,
      cacheHits: cacheStats.cacheHits,
      cacheMisses: cacheStats.cacheMisses
    });
  } catch (error) {
    console.error('Error fetching repo metrics:', error.message);
    res.status(500).json({ error: 'Failed to fetch repository metrics' });
  }
});

// Cache statistics endpoint
app.get('/api/cache-stats', (req, res) => {
  const hitRate = cacheStats.totalRequests > 0 
    ? ((cacheStats.cacheHits / cacheStats.totalRequests) * 100).toFixed(2)
    : 0;

  res.json({
    ...cacheStats,
    hitRate: `${hitRate}%`,
    timeSavedMs: cacheStats.timeSaved,
    cacheSize: cache.keys().length
  });
});

// Start server locally (skip listen if running under Vercel Serverless environment)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`DevMetrics server running on http://localhost:${port}`);
    console.log('Cache TTL: ' + (process.env.CACHE_TTL || 300) + 's');
    console.log('Cache stats endpoint: /api/cache-stats');
  });
}

export default app;
