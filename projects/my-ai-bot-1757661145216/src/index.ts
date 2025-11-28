import express from 'express';
import OpenAI from 'openai';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      ...history,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      stream: true,
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'OpenAI Chatbot API',
    endpoints: {
      chat: 'POST /api/chat'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🤖 OpenAI Chatbot running on http://localhost:${PORT}`);
});