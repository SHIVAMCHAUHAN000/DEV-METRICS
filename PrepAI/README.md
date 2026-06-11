# PrepAI - Interview Preparation with Gemini AI

A fast-to-deploy web application that uses Google's Gemini API to help users prepare for interviews with AI-powered question generation and feedback.

## Features

- **AI-Powered Interview Questions**: Generate realistic interview questions using Gemini API
- **Real-time Feedback**: Get instant feedback on your answers
- **Multiple Topics**: Support for various interview topics (DSA, System Design, Behavioral, etc.)
- **Session History**: Track your practice sessions

## Quick Start

### Prerequisites

- Node.js 16+
- Gemini API Key (get free at [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your Gemini API key to `.env`

5. Start the server:
   ```bash
   npm start
   ```

Server runs on `http://localhost:5000`

## Development

For development with hot-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/generate-question` - Generate interview question
- `POST /api/evaluate-answer` - Evaluate user's answer

## Deployment

Ready to deploy on Vercel, Railway, or any Node.js hosting platform.

## Performance Metrics

Track baseline metrics before optimization:
- API response time
- Average generation time
- User session duration

## License

MIT
