# FastAPI Python Application

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
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Run the development server:
   \`\`\`bash
   python main.py
   \`\`\`

   Or with uvicorn:
   \`\`\`bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   \`\`\`

## API Documentation

Once running, visit:
- Interactive API docs: http://localhost:8000/docs
- ReDoc documentation: http://localhost:8000/redoc

## API Endpoints

- \`GET /\` - API information
- \`GET /health\` - Health check
- \`GET /api/v1/items\` - Get all items
- \`POST /api/v1/items\` - Create item
- \`GET /api/v1/items/{id}\` - Get specific item
- \`PUT /api/v1/items/{id}\` - Update item
- \`DELETE /api/v1/items/{id}\` - Delete item

## Environment Variables

- \`PROJECT_NAME\` - Application name
- \`HOST\` - Server host (default: 0.0.0.0)
- \`PORT\` - Server port (default: 8000)
