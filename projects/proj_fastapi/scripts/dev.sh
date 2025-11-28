#!/bin/bash
# Development utility script for common tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_help() {
    echo "🚀 Elite FastAPI Development Utility"
    echo
    echo "USAGE:"
    echo "  ./scripts/dev.sh [COMMAND]"
    echo
    echo "COMMANDS:"
    echo "  setup     - Initial project setup"
    echo "  run       - Start development server"
    echo "  test      - Run tests"
    echo "  lint      - Run linting and formatting"
    echo "  migrate   - Run database migrations"
    echo "  seed      - Create initial data"
    echo "  clean     - Clean temporary files"
    echo "  build     - Build Docker image"
    echo "  compose   - Start services with docker-compose"
    echo "  check     - Health check all services"
    echo "  logs      - Show application logs"
    echo "  shell     - Open Python shell with app context"
    echo "  help      - Show this help"
    echo
}

setup_project() {
    log_info "Setting up Elite FastAPI project..."
    
    # Check if Python is available
    if ! command -v python &> /dev/null; then
        log_error "Python is not installed or not in PATH"
        exit 1
    fi
    
    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install -e .
    
    # Install pre-commit hooks
    if command -v pre-commit &> /dev/null; then
        log_info "Installing pre-commit hooks..."
        pre-commit install
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warning "Please edit .env file with your configuration"
    fi
    
    # Initialize database
    log_info "Initializing database..."
    python scripts/migrate.py init
    python scripts/migrate.py upgrade
    
    log_success "Project setup completed!"
}

run_server() {
    log_info "Starting development server..."
    python scripts/run.py
}

run_tests() {
    log_info "Running tests..."
    python -m pytest -v --cov=app --cov-report=term-missing "$@"
}

run_lint() {
    log_info "Running linting and formatting..."
    
    # Format with black and ruff
    ruff format .
    black .
    
    # Lint with ruff
    ruff check . --fix
    
    # Type checking with mypy
    mypy .
    
    # Security check with bandit
    if command -v bandit &> /dev/null; then
        bandit -r app/ -f json -o bandit-report.json
        log_info "Security report saved to bandit-report.json"
    fi
    
    log_success "Linting completed!"
}

run_migrations() {
    log_info "Running database migrations..."
    python scripts/migrate.py upgrade
}

seed_database() {
    log_info "Seeding database with initial data..."
    python scripts/migrate.py seed
}

clean_project() {
    log_info "Cleaning temporary files..."
    
    # Python cache
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type f -name "*.pyo" -delete 2>/dev/null || true
    
    # Test artifacts
    rm -rf .coverage .pytest_cache htmlcov/ 2>/dev/null || true
    
    # Logs
    rm -rf logs/ 2>/dev/null || true
    
    # Type checking
    rm -rf .mypy_cache 2>/dev/null || true
    
    # Ruff cache
    rm -rf .ruff_cache 2>/dev/null || true
    
    log_success "Cleanup completed!"
}

build_docker() {
    log_info "Building Docker image..."
    docker build -t elite-fastapi:latest .
    log_success "Docker image built successfully!"
}

start_compose() {
    log_info "Starting services with docker-compose..."
    docker-compose up -d postgres redis
    log_info "Services started. Use './scripts/dev.sh logs' to view logs"
}

health_check() {
    log_info "Performing health checks..."
    
    # Check if server is running
    if curl -f http://localhost:8000/healthz &> /dev/null; then
        log_success "Application server is healthy"
    else
        log_warning "Application server is not responding"
    fi
    
    # Check database
    if python -c "
import asyncio
from app.core.database import init_database
async def check():
    try:
        await init_database()
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
asyncio.run(check())
" 2>/dev/null; then
        :
    else
        log_warning "Database health check script failed"
    fi
    
    # Check Redis
    if python -c "
import asyncio
from app.core.redis import init_redis
async def check():
    try:
        await init_redis()
        print('✅ Redis connection successful')
    except Exception as e:
        print(f'❌ Redis connection failed: {e}')
asyncio.run(check())
" 2>/dev/null; then
        :
    else
        log_warning "Redis health check script failed"
    fi
}

show_logs() {
    log_info "Showing application logs..."
    if [ -d "logs" ]; then
        tail -f logs/*.log
    else
        log_warning "No log files found. Application may not be running."
    fi
}

open_shell() {
    log_info "Opening Python shell with application context..."
    python -c "
import asyncio
from app.main import app
from app.core.database import get_database_session
from app.models.user import User

print('🐍 Elite FastAPI Shell')
print('Available objects:')
print('  - app: FastAPI application')
print('  - User: User model')
print('  - get_database_session: Database session function')
print()

# Start interactive shell
import code
code.interact(local=locals())
"
}

# Main command handling
case "${1:-help}" in
    setup)
        setup_project
        ;;
    run)
        run_server
        ;;
    test)
        shift
        run_tests "$@"
        ;;
    lint)
        run_lint
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_database
        ;;
    clean)
        clean_project
        ;;
    build)
        build_docker
        ;;
    compose)
        start_compose
        ;;
    check)
        health_check
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
        ;;
    help|*)
        print_help
        ;;
esac