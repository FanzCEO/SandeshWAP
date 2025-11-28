# OpenAI Chatbot

A modern AI chatbot powered by OpenAI GPT with streaming responses.

## Features

- 🤖 OpenAI GPT integration
- 📡 Streaming responses
- 💬 Conversation history support
- 🔒 Secure API key handling
- ⚡ TypeScript support

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Add your OpenAI API key to .env
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## API Usage

Send a POST request to \`/api/chat\` with:
\`\`\`json
{
  "message": "Hello, how are you?",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}
\`\`\`

## Environment Variables

- \`OPENAI_API_KEY\` - Your OpenAI API key (required)
- \`PORT\` - Server port (default: 3000)
