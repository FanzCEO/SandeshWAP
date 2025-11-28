import type { ProjectTemplate } from '@shared/schema';

export const templates: ProjectTemplate[] = [
  // ===== ORIGINAL BACKWARD COMPATIBILITY TEMPLATES =====
  {
    id: 'nodejs-express',
    name: 'Node.js Express API',
    description: 'Simple Express.js REST API with TypeScript, CORS, and basic structure',
    category: 'backend',
    icon: '🚀',
    tags: ['Node.js', 'Express', 'TypeScript', 'REST API'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'nodejs-express-api',
          version: '1.0.0',
          description: 'Simple Express API',
          main: 'dist/index.js',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js'
          },
          dependencies: {
            express: '^4.18.2',
            cors: '^2.8.5',
            dotenv: '^16.3.1'
          },
          devDependencies: {
            '@types/express': '^4.17.21',
            '@types/node': '^20.10.5',
            tsx: '^4.6.2',
            typescript: '^5.3.3'
          }
        }, null, 2)
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `PORT=3000
NODE_ENV=development`
      },
      {
        path: 'src/index.ts',
        content: `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Node.js Express API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});`
      },
      {
        path: 'README.md',
        content: `# Node.js Express API

Simple Express.js REST API with TypeScript support.

## Features

- 🚀 Express.js framework
- ⚡ TypeScript support
- 🌐 CORS enabled
- 🔧 Development hot reload

## Setup

1. Install dependencies:
   \\\`\\\`\\\`bash
   npm install
   \\\`\\\`\\\`

2. Set up environment variables:
   \\\`\\\`\\\`bash
   cp .env.example .env
   \\\`\\\`\\\`

3. Run development server:
   \\\`\\\`\\\`bash
   npm run dev
   \\\`\\\`\\\`

## API Endpoints

- \\\`GET /\\\` - API status
- \\\`GET /api/health\\\` - Health check

## Building for Production

\\\`\\\`\\\`bash
npm run build
npm start
\\\`\\\`\\\`
`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },
  {
    id: 'nextjs-app',
    name: 'Next.js Application',
    description: 'Full-stack Next.js application with TypeScript, Tailwind CSS, and App Router',
    category: 'fullstack',
    icon: '⚡',
    tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Full Stack'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'nextjs-app',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            next: '14.0.4',
            react: '^18',
            'react-dom': '^18'
          },
          devDependencies: {
            typescript: '^5',
            '@types/node': '^20',
            '@types/react': '^18',
            '@types/react-dom': '^18',
            autoprefixer: '^10.0.1',
            eslint: '^8',
            'eslint-config-next': '14.0.4',
            postcss: '^8',
            tailwindcss: '^3.3.0'
          }
        }, null, 2)
      },
      {
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig`
      },
      {
        path: 'tailwind.config.ts',
        content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            lib: ['dom', 'dom.iterable', 'es6'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
            paths: { '@/*': ['./src/*'] }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2)
      },
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Welcome to Next.js! ⚡
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Get started by editing{' '}
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
              src/app/page.tsx
            </code>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">📖 Documentation</h2>
              <p className="text-gray-600">
                Find in-depth information about Next.js features and API.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">🎨 Templates</h2>
              <p className="text-gray-600">
                Discover and deploy boilerplate example Next.js projects.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">🚀 Deploy</h2>
              <p className="text-gray-600">
                Instantly deploy your Next.js site to a shareable URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}`
      },
      {
        path: 'src/app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`
      },
      {
        path: 'postcss.config.js',
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
      },
      {
        path: 'README.md',
        content: `# Next.js Application

A full-stack Next.js application with TypeScript, Tailwind CSS, and App Router.

## Features

- ⚡ Next.js 14 with App Router
- 🎨 Tailwind CSS for styling
- 📱 Responsive design
- 🔧 TypeScript support
- 🚀 Ready for deployment

## Getting Started

1. Install dependencies:
   \\\`\\\`\\\`bash
   npm install
   \\\`\\\`\\\`

2. Run the development server:
   \\\`\\\`\\\`bash
   npm run dev
   \\\`\\\`\\\`

3. Open [http://localhost:3000](http://localhost:3000) with your browser

## Building for Production

\\\`\\\`\\\`bash
npm run build
npm start
\\\`\\\`\\\`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },
  {
    id: 'fastapi-python',
    name: 'FastAPI Python',
    description: 'Modern FastAPI application with automatic OpenAPI docs, async support, and Pydantic',
    category: 'backend',
    icon: '🐍',
    tags: ['Python', 'FastAPI', 'Async', 'OpenAPI', 'REST API'],
    files: [
      {
        path: 'requirements.txt',
        content: `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0
python-multipart==0.0.6`
      },
      {
        path: '.env.example',
        content: `API_V1_STR=/api/v1
PROJECT_NAME=FastAPI App
HOST=0.0.0.0
PORT=8000`
      },
      {
        path: 'main.py',
        content: `from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "FastAPI App"),
    description="A modern FastAPI application with automatic OpenAPI documentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None
    total: float

# In-memory storage (use a database in production)
items_db: List[ItemResponse] = []
next_id = 1

@app.get("/")
async def root():
    return {
        "message": "Welcome to FastAPI!",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/items", response_model=List[ItemResponse])
async def get_items():
    """Get all items"""
    return items_db

@app.get("/api/v1/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int):
    """Get a specific item by ID"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@app.post("/api/v1/items", response_model=ItemResponse)
async def create_item(item: Item):
    """Create a new item"""
    global next_id
    
    total = item.price
    if item.tax:
        total += item.price * item.tax
    
    new_item = ItemResponse(
        id=next_id,
        name=item.name,
        description=item.description,
        price=item.price,
        tax=item.tax,
        total=total
    )
    
    items_db.append(new_item)
    next_id += 1
    
    return new_item

@app.put("/api/v1/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item: Item):
    """Update an existing item"""
    for i, existing_item in enumerate(items_db):
        if existing_item.id == item_id:
            total = item.price
            if item.tax:
                total += item.price * item.tax
            
            updated_item = ItemResponse(
                id=item_id,
                name=item.name,
                description=item.description,
                price=item.price,
                tax=item.tax,
                total=total
            )
            
            items_db[i] = updated_item
            return updated_item
    
    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/v1/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            deleted_item = items_db.pop(i)
            return {"message": f"Item {deleted_item.name} deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )`
      },
      {
        path: 'README.md',
        content: `# FastAPI Python Application

Modern FastAPI application with automatic OpenAPI documentation, async support, and Pydantic models.

## Features

- 🚀 FastAPI framework with automatic OpenAPI docs
- ⚡ Async/await support
- 📝 Automatic request/response validation with Pydantic
- 🌐 CORS middleware configured
- 📖 Interactive API documentation
- 🔧 Environment configuration

## Setup

1. Create a virtual environment:
   \\\`\\\`\\\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\\\Scripts\\\\activate
   \\\`\\\`\\\`

2. Install dependencies:
   \\\`\\\`\\\`bash
   pip install -r requirements.txt
   \\\`\\\`\\\`

3. Set up environment variables:
   \\\`\\\`\\\`bash
   cp .env.example .env
   \\\`\\\`\\\`

4. Run the development server:
   \\\`\\\`\\\`bash
   python main.py
   \\\`\\\`\\\`

   Or with uvicorn:
   \\\`\\\`\\\`bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   \\\`\\\`\\\`

## API Documentation

Once running, visit:
- Interactive API docs: http://localhost:8000/docs
- ReDoc documentation: http://localhost:8000/redoc

## API Endpoints

- \\\`GET /\\\` - API information
- \\\`GET /health\\\` - Health check
- \\\`GET /api/v1/items\\\` - Get all items
- \\\`POST /api/v1/items\\\` - Create item
- \\\`GET /api/v1/items/{id}\\\` - Get specific item
- \\\`PUT /api/v1/items/{id}\\\` - Update item
- \\\`DELETE /api/v1/items/{id}\\\` - Delete item

## Environment Variables

- \\\`PROJECT_NAME\\\` - Application name
- \\\`HOST\\\` - Server host (default: 0.0.0.0)
- \\\`PORT\\\` - Server port (default: 8000)
`
      }
    ],
    commands: {
      install: 'pip install -r requirements.txt',
      dev: 'python main.py',
      build: '',
      start: 'uvicorn main:app --host 0.0.0.0 --port 8000'
    }
  },

  // ===== AI & MACHINE LEARNING TEMPLATES =====
  {
    id: 'openai-chatbot',
    name: 'OpenAI Chatbot',
    description: 'A modern chatbot powered by OpenAI GPT with streaming responses and conversation history',
    category: 'ai',
    icon: '🤖',
    tags: ['OpenAI', 'ChatGPT', 'Chatbot', 'AI', 'Streaming'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'openai-chatbot',
          version: '1.0.0',
          description: 'AI Chatbot powered by OpenAI',
          main: 'dist/index.js',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js'
          },
          dependencies: {
            express: '^4.18.2',
            openai: '^4.26.0',
            cors: '^2.8.5',
            dotenv: '^16.3.1',
            helmet: '^7.1.0'
          },
          devDependencies: {
            '@types/express': '^4.17.21',
            '@types/node': '^20.10.5',
            tsx: '^4.6.2',
            typescript: '^5.3.3'
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development`
      },
      {
        path: 'src/index.ts',
        content: `import express from 'express';
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
  console.log(\`🤖 OpenAI Chatbot running on http://localhost:\${PORT}\`);
});`
      },
      {
        path: 'README.md',
        content: `# OpenAI Chatbot

A modern AI chatbot powered by OpenAI GPT with streaming responses.

## Features

- 🤖 OpenAI GPT integration
- 📡 Streaming responses
- 💬 Conversation history support
- 🔒 Secure API key handling
- ⚡ TypeScript support

## Setup

1. Install dependencies:
   \\\`\\\`\\\`bash
   npm install
   \\\`\\\`\\\`

2. Set up environment variables:
   \\\`\\\`\\\`bash
   cp .env.example .env
   # Add your OpenAI API key to .env
   \\\`\\\`\\\`

3. Run the development server:
   \\\`\\\`\\\`bash
   npm run dev
   \\\`\\\`\\\`

## API Usage

Send a POST request to \\\`/api/chat\\\` with:
\\\`\\\`\\\`json
{
  "message": "Hello, how are you?",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}
\\\`\\\`\\\`

## Environment Variables

- \\\`OPENAI_API_KEY\\\` - Your OpenAI API key (required)
- \\\`PORT\\\` - Server port (default: 3000)
`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },
  {
    id: 'anthropic-claude',
    name: 'Anthropic Claude Integration',
    description: 'AI assistant powered by Anthropic Claude with conversation management',
    category: 'ai',
    icon: '🧠',
    tags: ['Anthropic', 'Claude', 'AI', 'Assistant'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'claude-ai-assistant',
          version: '1.0.0',
          description: 'AI Assistant powered by Anthropic Claude',
          main: 'dist/index.js',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js'
          },
          dependencies: {
            '@anthropic-ai/sdk': '^0.17.0',
            express: '^4.18.2',
            cors: '^2.8.5',
            dotenv: '^16.3.1',
            helmet: '^7.1.0'
          },
          devDependencies: {
            '@types/express': '^4.17.21',
            '@types/node': '^20.10.5',
            tsx: '^4.6.2',
            typescript: '^5.3.3'
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000
NODE_ENV=development`
      },
      {
        path: 'src/index.ts',
        content: `import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const messages = [
      ...history,
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages,
    });

    res.json({
      message: response.content[0].text,
      usage: response.usage
    });
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Claude AI Assistant API',
    endpoints: {
      chat: 'POST /api/chat'
    }
  });
});

app.listen(PORT, () => {
  console.log(\`🧠 Claude AI Assistant running on http://localhost:\${PORT}\`);
});`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },

  // ===== BACKEND TEMPLATES =====
  {
    id: 'flask-api',
    name: 'Flask REST API',
    description: 'A modern Python Flask API with JWT authentication, SQLAlchemy, and API documentation',
    category: 'backend',
    icon: '🐍',
    tags: ['Python', 'Flask', 'REST API', 'JWT', 'SQLAlchemy'],
    files: [
      {
        path: 'requirements.txt',
        content: `Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-JWT-Extended==4.6.0
Flask-CORS==4.0.0
Flask-Migrate==4.0.7
python-dotenv==1.0.0
marshmallow==3.20.2
bcrypt==4.1.2
gunicorn==21.2.0`
      },
      {
        path: '.env.example',
        content: `FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///app.db
CORS_ORIGIN=http://localhost:3000`
      },
      {
        path: 'app.py',
        content: `from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, origins=os.getenv('CORS_ORIGIN'))

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Routes
@app.route('/')
def home():
    return jsonify({
        'message': 'Flask REST API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth',
            'users': '/api/users',
            'posts': '/api/posts'
        }
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/posts', methods=['GET'])
@jwt_required()
def get_posts():
    posts = Post.query.all()
    return jsonify([{
        'id': post.id,
        'title': post.title,
        'content': post.content,
        'user_id': post.user_id
    } for post in posts])

@app.route('/api/posts', methods=['POST'])
@jwt_required()
def create_post():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    post = Post(
        title=data['title'],
        content=data['content'],
        user_id=user_id
    )
    
    db.session.add(post)
    db.session.commit()
    
    return jsonify({
        'id': post.id,
        'title': post.title,
        'content': post.content,
        'user_id': post.user_id
    }), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)`
      },
      {
        path: 'README.md',
        content: `# Flask REST API

A modern Python Flask API with JWT authentication and SQLAlchemy.

## Features

- 🔐 JWT Authentication
- 🗄️ SQLAlchemy ORM
- 🔒 Password hashing with bcrypt
- 🌐 CORS configuration
- 📝 Clean project structure

## Setup

1. Install dependencies:
   \\\`\\\`\\\`bash
   pip install -r requirements.txt
   \\\`\\\`\\\`

2. Set up environment variables:
   \\\`\\\`\\\`bash
   cp .env.example .env
   # Update the .env file with your settings
   \\\`\\\`\\\`

3. Run the application:
   \\\`\\\`\\\`bash
   python app.py
   \\\`\\\`\\\`

## API Endpoints

- \\\`POST /api/auth/register\\\` - Register a new user
- \\\`POST /api/auth/login\\\` - Login user
- \\\`GET /api/posts\\\` - Get all posts (requires auth)
- \\\`POST /api/posts\\\` - Create a new post (requires auth)
`
      }
    ],
    commands: {
      install: 'pip install -r requirements.txt',
      dev: 'python app.py',
      build: '',
      start: 'gunicorn --bind 0.0.0.0:5000 app:app'
    }
  },
  {
    id: 'django-rest',
    name: 'Django REST API',
    description: 'A powerful Django REST API with DRF, authentication, and admin interface',
    category: 'backend',
    icon: '🎸',
    tags: ['Python', 'Django', 'DRF', 'REST API', 'Admin'],
    files: [
      {
        path: 'requirements.txt',
        content: `Django==5.0.0
djangorestframework==3.14.0
django-cors-headers==4.3.1
python-decouple==3.8
Pillow==10.1.0
gunicorn==21.2.0`
      },
      {
        path: '.env.example',
        content: `SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000`
      },
      {
        path: 'manage.py',
        content: `#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)`
      }
    ],
    commands: {
      install: 'pip install -r requirements.txt',
      dev: 'python manage.py runserver 0.0.0.0:8000',
      build: 'python manage.py collectstatic --noinput',
      start: 'gunicorn project.wsgi:application --bind 0.0.0.0:8000'
    }
  },
  {
    id: 'go-web-server',
    name: 'Go Web Server',
    description: 'High-performance web server built with Go, Gin framework, and JWT authentication',
    category: 'backend',
    icon: '🐹',
    tags: ['Go', 'Gin', 'REST API', 'JWT', 'High Performance'],
    files: [
      {
        path: 'go.mod',
        content: `module go-web-server

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/joho/godotenv v1.4.0
    golang.org/x/crypto v0.18.0
    gorm.io/driver/sqlite v1.5.4
    gorm.io/gorm v1.25.5
)`
      },
      {
        path: '.env.example',
        content: `PORT=8080
JWT_SECRET=your-jwt-secret-key-here
DB_PATH=./app.db
GIN_MODE=debug`
      },
      {
        path: 'main.go',
        content: `package main

import (
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/joho/godotenv"
    "golang.org/x/crypto/bcrypt"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

// Models
type User struct {
    ID       uint   \\\`json:"id" gorm:"primaryKey"\\\`
    Username string \\\`json:"username" gorm:"unique;not null"\\\`
    Email    string \\\`json:"email" gorm:"unique;not null"\\\`
    Password string \\\`json:"-" gorm:"not null"\\\`
}

type Claims struct {
    UserID uint \\\`json:"user_id"\\\`
    jwt.RegisteredClaims
}

var db *gorm.DB
var jwtSecret []byte

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    jwtSecret = []byte(getEnv("JWT_SECRET", "default-secret-key"))

    // Initialize database
    var err error
    db, err = gorm.Open(sqlite.Open(getEnv("DB_PATH", "./app.db")), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Auto migrate schemas
    db.AutoMigrate(&User{})

    // Set Gin mode
    gin.SetMode(getEnv("GIN_MODE", "release"))

    // Initialize router
    r := gin.Default()

    // Routes
    r.GET("/", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Go Web Server API",
            "version": "1.0.0",
        })
    })

    r.GET("/api/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":    "healthy",
            "timestamp": time.Now(),
        })
    })

    port := getEnv("PORT", "8080")
    log.Printf("🐹 Go Web Server starting on port %s", port)
    log.Fatal(r.Run(":" + port))
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}`
      },
      {
        path: 'README.md',
        content: `# Go Web Server

A high-performance REST API built with Go, Gin framework, and GORM.

## Features

- 🚀 High-performance HTTP server with Gin
- 🔐 JWT authentication
- 🗄️ SQLite database with GORM
- 🔒 Password hashing with bcrypt
- 🌐 CORS support
- 📝 Clean architecture

## Getting Started

1. Install Go 1.21 or later

2. Install dependencies:
   \\\`\\\`\\\`bash
   go mod tidy
   \\\`\\\`\\\`

3. Set up environment variables:
   \\\`\\\`\\\`bash
   cp .env.example .env
   # Update the .env file with your settings
   \\\`\\\`\\\`

4. Run the application:
   \\\`\\\`\\\`bash
   go run main.go
   \\\`\\\`\\\`

## API Endpoints

- \\\`POST /api/auth/register\\\` - Register a new user
- \\\`POST /api/auth/login\\\` - Login user
- \\\`GET /api/users\\\` - Get all users (requires auth)

## Building for Production

\\\`\\\`\\\`bash
go build -o server main.go
./server
\\\`\\\`\\\`
`
      }
    ],
    commands: {
      install: 'go mod tidy',
      dev: 'go run main.go',
      build: 'go build -o server main.go',
      start: './server'
    }
  },

  // ===== FRONTEND TEMPLATES =====
  {
    id: 'vue-app',
    name: 'Vue.js Application',
    description: 'Modern Vue 3 app with Composition API, Pinia, and Tailwind CSS',
    category: 'frontend',
    icon: '💚',
    tags: ['Vue.js', 'Composition API', 'Pinia', 'Tailwind CSS', 'TypeScript'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'vue-app',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'vite',
            build: 'vue-tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            vue: '^3.4.0',
            pinia: '^2.1.7',
            'vue-router': '^4.2.5'
          },
          devDependencies: {
            '@vitejs/plugin-vue': '^5.0.0',
            '@vue/tsconfig': '^0.5.0',
            'autoprefixer': '^10.4.16',
            'postcss': '^8.4.32',
            'tailwindcss': '^3.4.0',
            'typescript': '^5.3.0',
            'vite': '^5.0.0',
            'vue-tsc': '^1.8.25'
          }
        }, null, 2)
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/vite.svg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`
      },
      {
        path: 'src/main.ts',
        content: `import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import About from './pages/About.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm run preview'
    }
  },
  {
    id: 'svelte-app',
    name: 'SvelteKit Application',
    description: 'Modern SvelteKit app with TypeScript, Tailwind CSS, and server-side rendering',
    category: 'frontend',
    icon: '🧡',
    tags: ['Svelte', 'SvelteKit', 'TypeScript', 'Tailwind CSS', 'SSR'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'sveltekit-app',
          version: '0.0.1',
          private: true,
          scripts: {
            dev: 'vite dev',
            build: 'vite build',
            preview: 'vite preview'
          },
          devDependencies: {
            '@sveltejs/adapter-auto': '^3.0.0',
            '@sveltejs/kit': '^2.0.0',
            '@sveltejs/vite-plugin-svelte': '^3.0.0',
            'autoprefixer': '^10.4.16',
            'postcss': '^8.4.32',
            'svelte': '^4.2.7',
            'tailwindcss': '^3.4.0',
            'typescript': '^5.0.0',
            'vite': '^5.0.3'
          }
        }, null, 2)
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm run preview'
    }
  },

  // ===== FULLSTACK TEMPLATES =====
  {
    id: 'mern-stack',
    name: 'MERN Stack Application',
    description: 'Full-stack MERN (MongoDB, Express, React, Node.js) application with authentication',
    category: 'fullstack',
    icon: '🚀',
    tags: ['MongoDB', 'Express', 'React', 'Node.js', 'JWT', 'Full-stack'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'mern-stack-app',
          version: '1.0.0',
          description: 'MERN Stack Application',
          main: 'server/index.js',
          scripts: {
            dev: 'concurrently "npm run server" "npm run client"',
            server: 'nodemon server/index.js',
            client: 'cd client && npm start',
            build: 'cd client && npm run build',
            'install-all': 'npm install && cd client && npm install'
          },
          dependencies: {
            express: '^4.18.2',
            mongoose: '^8.0.3',
            jsonwebtoken: '^9.0.2',
            bcryptjs: '^2.4.3',
            cors: '^2.8.5',
            dotenv: '^16.3.1'
          },
          devDependencies: {
            nodemon: '^3.0.2',
            concurrently: '^8.2.2'
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `PORT=5000
MONGODB_URI=mongodb://localhost:27017/mern-app
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development`
      }
    ],
    commands: {
      install: 'npm run install-all',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },

  // ===== BOT TEMPLATES =====
  {
    id: 'discord-bot',
    name: 'Discord Bot',
    description: 'Feature-rich Discord bot with slash commands, event handling, and database integration',
    category: 'bots',
    icon: '🤖',
    tags: ['Discord', 'Bot', 'JavaScript', 'Slash Commands'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'discord-bot',
          version: '1.0.0',
          description: 'A Discord bot with slash commands',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js'
          },
          dependencies: {
            'discord.js': '^14.14.1',
            dotenv: '^16.3.1'
          },
          devDependencies: {
            nodemon: '^3.0.2'
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: '',
      start: 'npm start'
    }
  },

  // ===== MOBILE & DESKTOP TEMPLATES =====
  {
    id: 'react-native-app',
    name: 'React Native App',
    description: 'Cross-platform mobile app with React Navigation, native components, and TypeScript',
    category: 'mobile',
    icon: '📱',
    tags: ['React Native', 'Mobile', 'Cross-platform', 'TypeScript'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'ReactNativeApp',
          version: '0.0.1',
          private: true,
          scripts: {
            android: 'react-native run-android',
            ios: 'react-native run-ios',
            start: 'react-native start',
            test: 'jest',
            lint: 'eslint . --ext .js,.jsx,.ts,.tsx'
          },
          dependencies: {
            'react': '18.2.0',
            'react-native': '0.73.2',
            '@react-navigation/native': '^6.1.9',
            '@react-navigation/stack': '^6.3.20',
            'react-native-screens': '^3.29.0',
            'react-native-safe-area-context': '^4.8.2'
          }
        }, null, 2)
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm start',
      build: 'npm run android',
      start: 'npm run android'
    }
  },
  {
    id: 'electron-app',
    name: 'Electron Desktop App',
    description: 'Cross-platform desktop application with modern web technologies',
    category: 'desktop',
    icon: '💻',
    tags: ['Electron', 'Desktop', 'Cross-platform', 'TypeScript'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'electron-desktop-app',
          version: '1.0.0',
          description: 'A modern Electron desktop application',
          main: 'dist/main.js',
          scripts: {
            dev: 'concurrently "npm run build:watch" "npm run electron:dev"',
            'build:watch': 'tsc -w',
            'electron:dev': 'wait-on dist/main.js && electron .',
            build: 'tsc && electron-builder',
            'build:win': 'tsc && electron-builder --win',
            'build:mac': 'tsc && electron-builder --mac',
            'build:linux': 'tsc && electron-builder --linux'
          },
          dependencies: {
            electron: '^28.2.0'
          }
        }, null, 2)
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm run electron:dev'
    }
  },

  // ===== DEVOPS TEMPLATES =====
  {
    id: 'cli-tool-node',
    name: 'Node.js CLI Tool',
    description: 'Professional command-line interface tool with argument parsing and subcommands',
    category: 'devops',
    icon: '⚡',
    tags: ['CLI', 'Node.js', 'TypeScript', 'Commander.js'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'awesome-cli-tool',
          version: '1.0.0',
          description: 'A powerful CLI tool built with Node.js',
          main: 'dist/index.js',
          bin: {
            'awesome-cli': './dist/index.js'
          },
          scripts: {
            build: 'tsc',
            dev: 'tsx src/index.ts',
            start: 'node dist/index.js',
            'build:watch': 'tsc --watch',
            link: 'npm link',
            unlink: 'npm unlink'
          },
          dependencies: {
            commander: '^11.1.0',
            chalk: '^5.3.0',
            inquirer: '^9.2.12',
            ora: '^8.0.1',
            'node-fetch': '^3.3.2'
          }
        }, null, 2)
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  },

  // ===== DATABASE TEMPLATES =====
  {
    id: 'postgresql-api',
    name: 'PostgreSQL REST API',
    description: 'RESTful API with PostgreSQL, connection pooling, and advanced querying',
    category: 'database',
    icon: '🐘',
    tags: ['PostgreSQL', 'REST API', 'Node.js', 'SQL'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'postgresql-api',
          version: '1.0.0',
          description: 'REST API with PostgreSQL database',
          main: 'dist/index.js',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js',
            'db:migrate': 'node dist/migrate.js',
            'db:seed': 'node dist/seed.js'
          },
          dependencies: {
            express: '^4.18.2',
            pg: '^8.11.3',
            cors: '^2.8.5',
            dotenv: '^16.3.1',
            helmet: '^7.1.0',
            joi: '^17.11.0'
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `# Database
DATABASE_URL=postgresql://username:password@localhost:5432/myapp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=username
DB_PASSWORD=password
DB_SSL=false

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000`
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start'
    }
  }
];

export function getTemplates(): ProjectTemplate[] {
  return templates;
}

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return templates.find(template => template.id === id);
}

export function getTemplatesByCategory(category: string): ProjectTemplate[] {
  return templates.filter(template => template.category === category);
}