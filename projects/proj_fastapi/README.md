# 🚀 Elite FastAPI

An enterprise-grade FastAPI application with comprehensive observability, authentication, and production-ready features.

## ✨ Features

- **⚡ FastAPI 0.115+** with async/await support
- **🗃️ Async SQLAlchemy 2.0** with PostgreSQL
- **🔐 Complete Authentication System** - JWT, OAuth2, Argon2 password hashing
- **📊 Observability Stack** - OpenTelemetry tracing, Prometheus metrics, structured logging
- **🔒 Security First** - CORS, CSRF protection, input validation, security headers
- **🏗️ Production Ready** - Docker, CI/CD, health checks, graceful shutdown
- **🧪 Comprehensive Testing** - 95%+ test coverage with pytest
- **📝 Real-time Features** - WebSocket support for live updates
- **🚀 Auto-generated API Docs** - Interactive Swagger UI and ReDoc
- **🔄 Database Migrations** - Alembic integration with auto-generation
- **📈 Performance Monitoring** - Request tracing and metrics collection

## 🏗️ Architecture

```
Elite FastAPI
├── 🎯 Core Application Layer
│   ├── FastAPI with async middleware stack
│   ├── Pydantic v2 for validation and serialization  
│   └── Structured error handling and logging
├── 🗄️ Data Layer
│   ├── Async SQLAlchemy 2.0 with asyncpg
│   ├── Redis for caching and sessions
│   └── Alembic for database migrations
├── 🔐 Authentication & Security
│   ├── JWT tokens with refresh mechanism
│   ├── OAuth2 flows (Google, GitHub)
│   ├── Argon2 password hashing
│   └── RBAC with user roles and permissions
├── 📡 API Layer  
│   ├── RESTful API with OpenAPI 3.1
│   ├── WebSocket endpoints for real-time features
│   ├── Rate limiting and request validation
│   └── Comprehensive error responses
├── 📊 Observability
│   ├── OpenTelemetry distributed tracing
│   ├── Prometheus metrics collection
│   ├── Structured logging with Loguru
│   └── Health and readiness checks
└── 🚀 Infrastructure
    ├── Multi-stage Docker containers
    ├── Docker Compose for local development
    ├── GitHub Actions CI/CD pipeline
    └── Security scanning and dependency checks
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** 
- **PostgreSQL 13+** (or use Docker)
- **Redis 6+** (or use Docker)
- **Git**

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd proj_fastapi

# Run setup script
./scripts/dev.sh setup
```

This will:
- Install all Python dependencies
- Create `.env` file from template
- Initialize database migrations
- Set up pre-commit hooks

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/elite_fastapi

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis with Docker
./scripts/dev.sh compose

# Or install locally:
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download
```

### 4. Initialize Database

```bash
# Run migrations
./scripts/dev.sh migrate

# Create initial superuser
./scripts/dev.sh seed
```

### 5. Start Development Server

```bash
# Start the development server
./scripts/dev.sh run

# Or directly:
python scripts/run.py
```

The application will be available at:
- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs  
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/healthz
- **Metrics**: http://localhost:8000/metrics

## 📚 API Documentation

### Authentication Endpoints

```http
POST /api/v1/auth/register     # Register new user
POST /api/v1/auth/login        # Login with email/password
POST /api/v1/auth/refresh      # Refresh access token
POST /api/v1/auth/logout       # Logout and invalidate token
GET  /api/v1/auth/me           # Get current user info
POST /api/v1/auth/password/change  # Change password
```

### User Management Endpoints

```http
GET    /api/v1/users/          # List users (admin)
POST   /api/v1/users/          # Create user (admin)
GET    /api/v1/users/{id}      # Get user by ID
PUT    /api/v1/users/{id}      # Update user
DELETE /api/v1/users/{id}      # Delete user (admin)
PUT    /api/v1/users/me/profile # Update own profile
```

### WebSocket Endpoints

```http
WS /api/v1/ws/connect?token=<jwt_token>  # Real-time connection
```

### Health & Monitoring

```http
GET /healthz                   # Basic health check
GET /readyz                    # Readiness check with dependencies
GET /metrics                   # Prometheus metrics
```

## 🧪 Testing

```bash
# Run all tests
./scripts/dev.sh test

# Run with coverage
./scripts/dev.sh test --cov=app --cov-report=html

# Run specific test file
./scripts/dev.sh test tests/test_auth.py

# Run with specific markers
./scripts/dev.sh test -m "not slow"
```

### Test Structure

```
tests/
├── conftest.py              # Test configuration and fixtures
├── test_auth.py            # Authentication tests
├── test_users.py           # User management tests
├── test_websocket.py       # WebSocket tests
└── test_integration.py     # Integration tests
```

## 🔧 Development Tools

### Code Quality

```bash
# Format code
./scripts/dev.sh lint

# Or individual tools:
ruff format .                # Fast formatting
black .                      # Code formatting  
ruff check . --fix          # Linting with auto-fix
mypy .                       # Type checking
bandit -r app/              # Security analysis
```

### Database Operations

```bash
# Create migration
python scripts/migrate.py create "Add new feature"

# Apply migrations  
python scripts/migrate.py upgrade

# Rollback migration
python scripts/migrate.py downgrade -1

# Check current revision
python scripts/migrate.py current

# Reset database (⚠️ DESTRUCTIVE)
python scripts/migrate.py reset
```

### Utility Scripts

```bash
# Development server with auto-reload
python scripts/run.py

# Interactive shell with app context
./scripts/dev.sh shell

# Health check all services
./scripts/dev.sh check

# View logs
./scripts/dev.sh logs

# Clean temporary files
./scripts/dev.sh clean
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build production image
./scripts/dev.sh build

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Production Environment Variables

```env
# Core settings
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/elite_fastapi

# Security
SECRET_KEY=production-secret-key
JWT_SECRET_KEY=production-jwt-secret
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

# Observability  
OPENTELEMETRY_ENDPOINT=https://your-otel-collector:4317
PROMETHEUS_METRICS_ENABLED=true

# Performance
WORKERS=4
MAX_CONNECTIONS=100
```

## 📊 Monitoring & Observability

### Metrics Collection

The application exposes Prometheus metrics at `/metrics`:

- **Request metrics**: Response times, status codes, throughput
- **Database metrics**: Connection pool size, query performance  
- **Redis metrics**: Cache hit rates, operation counts
- **Application metrics**: User activity, feature usage

### Distributed Tracing

OpenTelemetry integration provides:

- **Automatic instrumentation** for FastAPI, SQLAlchemy, Redis
- **Custom spans** for business logic
- **Trace correlation** across service boundaries
- **Performance insights** and bottleneck identification

### Structured Logging

```python
from app.core.observability import get_logger

logger = get_logger("my_module")

# Structured logging with context
logger.info("User action", 
    user_id=123, 
    action="login", 
    ip_address="192.168.1.1"
)

# Error logging with automatic context
logger.error("Database error", 
    error=str(e),
    query="SELECT * FROM users"
)
```

## 🔒 Security Features

### Authentication & Authorization

- **JWT tokens** with configurable expiration
- **Refresh token rotation** for enhanced security  
- **OAuth2 integration** with Google, GitHub
- **Role-based access control** (RBAC)
- **Password policies** with strength validation

### Security Middleware

- **CORS protection** with configurable origins
- **CSRF protection** for state-changing operations
- **Rate limiting** per IP and user
- **Security headers** (HSTS, CSP, etc.)
- **Input validation** and sanitization

### Data Protection

- **Argon2 password hashing** with salt
- **Sensitive data masking** in logs
- **SQL injection prevention** via ORM
- **XSS protection** via input validation

## 🚀 Production Deployment

### Environment Setup

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
2. **Redis**: Use managed Redis (AWS ElastiCache, Redis Labs, etc.)
3. **Secrets**: Use secret management service (AWS Secrets Manager, etc.)
4. **Load Balancer**: Configure with health check endpoints

### Container Orchestration

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elite-fastapi
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: elite-fastapi:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8000
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8000
```

### CI/CD Pipeline

The included GitHub Actions workflow provides:

- **Automated testing** on multiple Python versions
- **Security scanning** with pip-audit and bandit
- **Container scanning** for vulnerabilities
- **SBOM generation** for supply chain security
- **Automated deployments** on successful builds

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `./scripts/dev.sh setup`
4. Make changes and add tests
5. Run tests and linting: `./scripts/dev.sh test && ./scripts/dev.sh lint`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards

- **Python 3.11+** with type hints
- **100% test coverage** for new features
- **PEP 8** compliance via Black and Ruff
- **Security-first** mindset
- **Performance considerations** for database queries
- **Comprehensive documentation** for APIs

## 📋 API Usage Examples

### User Registration

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "newuser",
    "password": "SecurePass123!",
    "full_name": "New User"
  }'
```

### User Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "SecurePass123!"
  }'
```

### Authenticated Request

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

### WebSocket Connection

```javascript
// JavaScript WebSocket client
const token = 'your_jwt_token';
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/connect?token=${token}`);

ws.onopen = function() {
    console.log('Connected to WebSocket');
    
    // Send ping message
    ws.send(JSON.stringify({ type: 'ping' }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};
```

## 📞 Support & Documentation

- **GitHub Issues**: Report bugs and request features
- **API Documentation**: Available at `/docs` and `/redoc` 
- **OpenAPI Schema**: Available at `/api/v1/openapi.json`
- **Health Checks**: Use `/healthz` and `/readyz` for monitoring

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - The Python SQL toolkit and Object-Relational Mapping library
- **Pydantic** - Data validation and settings management using Python type hints
- **OpenTelemetry** - Observability framework for cloud-native software
- **Prometheus** - Systems monitoring and alerting toolkit

---

**Built with ❤️ for production-ready applications**