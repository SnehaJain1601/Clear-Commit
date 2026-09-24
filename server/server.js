import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: new URL('./.env', import.meta.url) });
dotenv.config({ path: new URL('../.env', import.meta.url) });

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

async function generateWithGemini(diffText) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add your Google Gemini API key in the server .env file.');
  }

  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `You are an expert Git commit message composer. Based on the following git diff, return only a single clean commit title in conventional commit format. Keep it concise, clear, and professional. Example formats: "feat: add user dashboard", "fix: resolve login validation bug", "docs: update API usage guide". Here is the diff:\n\n${diffText}`;

  const result = await genAI.interactions.create({
    model: GEMINI_MODEL,
    input: prompt,
    store: false
  });
  const text = result.output_text;

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim().replace(/^\s*['\"]|['\"]\s*$/g, '');
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Commit AI API is running' });
});

async function handleGenerateRequest(req, res) {
  const diffFromBody = req.body && req.body.diff;
  const diffFromQuery = req.query && req.query.diff;
  const diff = typeof diffFromBody === 'string' ? diffFromBody : typeof diffFromQuery === 'string' ? diffFromQuery : '';

  if (!diff || !String(diff).trim()) {
    return res.status(400).json({ error: 'Please paste a git diff before generating a commit message.' });
  }

  try {
    const message = await generateWithGemini(String(diff));
    return res.json({ commitMessage: message, provider: 'gemini' });
  } catch (error) {
    console.error('Gemini request failed:', error.message);
    return res.status(500).json({
      error: error.message || 'Gemini request failed.'
    });
  }
}

app.get('/api/generate-commit-message', handleGenerateRequest);
app.post('/api/generate-commit-message', handleGenerateRequest);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
