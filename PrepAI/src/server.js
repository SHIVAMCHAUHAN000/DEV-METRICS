import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Performance tracking
const metrics = {
  startTime: Date.now(),
  totalRequests: 0,
  totalApiCalls: 0,
  avgResponseTime: 0
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Date.now() - metrics.startTime,
    metrics: metrics
  });
});

// Generate interview question
app.post('/api/generate-question', async (req, res) => {
  const startTime = Date.now();
  metrics.totalRequests++;

  try {
    const { topic = 'DSA', difficulty = 'medium' } = req.body;

    const prompt = `Generate a single ${difficulty} level ${topic} interview question. 
    Format: 
    QUESTION: [The question]
    CONTEXT: [Any important context]
    HINT: [A helpful hint]`;

    metrics.totalApiCalls++;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const responseTime = Date.now() - startTime;
    metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;

    res.json({
      question: text,
      topic,
      difficulty,
      generatedAt: new Date().toISOString(),
      responseTime
    });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// Evaluate user's answer
app.post('/api/evaluate-answer', async (req, res) => {
  const startTime = Date.now();
  metrics.totalRequests++;

  try {
    const { question, userAnswer, topic = 'General' } = req.body;

    const prompt = `As an expert interviewer, evaluate this ${topic} interview answer:

QUESTION: ${question}

USER'S ANSWER: ${userAnswer}

Provide:
1. Score (1-10)
2. Strengths (2-3 bullet points)
3. Areas to improve (2-3 bullet points)
4. Sample better answer (2-3 sentences)`;

    metrics.totalApiCalls++;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const responseTime = Date.now() - startTime;
    metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;

    res.json({
      feedback: text,
      evaluatedAt: new Date().toISOString(),
      responseTime
    });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`PrepAI server running on http://localhost:${port}`);
  console.log('Metrics endpoint: /api/health');
});
