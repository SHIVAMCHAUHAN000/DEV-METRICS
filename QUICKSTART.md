# Quick Start Guide

Run each project with these simple commands:

## PrepAI (Port 5000)

```bash
cd PrepAI
npm install
cp .env.example .env
# Edit .env and add your Gemini API key
npm start
# Visit: http://localhost:5000
```

## DevMetrics (Port 5001)

```bash
cd DevMetrics
npm install
cp .env.example .env
# Edit .env and add GitHub OAuth credentials
npm start
# Visit: http://localhost:5001
```

## CodeCollab (Port 5002)

```bash
cd CodeCollab
npm install
cp .env.example .env
npm start
# Visit: http://localhost:5002
# Open in TWO browser windows to test real-time collaboration
```

---

## All Projects at Once (Terminal 1)

```bash
# Terminal 1
cd PrepAI && npm start

# Terminal 2
cd DevMetrics && npm start

# Terminal 3
cd CodeCollab && npm start

# Then visit:
# PrepAI: http://localhost:5000
# DevMetrics: http://localhost:5001
# CodeCollab: http://localhost:5002
```

---

## What to Do First

1. **Start with PrepAI** — Easiest, get it running in 5 minutes
2. **Deploy PrepAI** — Share with friends, get feedback
3. **Then build DevMetrics** — GitHub OAuth is the learning opportunity
4. **Measure metrics** — Before/after performance numbers
5. **Finally CodeCollab** — Most impressive, requires testing with 2 windows

See `BUILD_GUIDE.md` for detailed instructions and interview tips.
