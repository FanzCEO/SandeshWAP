#!/usr/bin/env python3
"""Development server runner with automatic reload and proper configuration."""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import uvicorn
from app.core.config import settings
from app.core.observability import setup_logging, get_logger

# Setup logging first
setup_logging()
logger = get_logger("dev_server")


async def check_dependencies():
    """Check if required services are available."""
    logger.info("Checking dependencies...")
    
    # Check if we can import core modules
    try:
        from app.main import app
        logger.info("✓ FastAPI application imports successfully")
    except ImportError as e:
        logger.error(f"✗ Failed to import FastAPI app: {e}")
        return False
    
    # Check database connection
    try:
        from app.core.database import init_database
        await init_database()
        logger.info("✓ Database connection successful")
    except Exception as e:
        logger.warning(f"⚠ Database connection failed: {e}")
        logger.info("  Database will be available when you configure DATABASE_URL")
    
    # Check Redis connection
    try:
        from app.core.redis import init_redis
        await init_redis()
        logger.info("✓ Redis connection successful")
    except Exception as e:
        logger.warning(f"⚠ Redis connection failed: {e}")
        logger.info("  Redis will be available when you configure REDIS_URL")
    
    return True


def print_startup_info():
    """Print startup information and available endpoints."""
    print("\n" + "="*60)
    print("🚀 Elite FastAPI Development Server")
    print("="*60)
    print(f"Application: {settings.app_name}")
    print(f"Version: {settings.app_version}")
    print(f"Environment: {settings.otel_environment}")
    print(f"Debug Mode: {settings.debug}")
    print(f"Host: {settings.host}")
    print(f"Port: {settings.port}")
    print("-"*60)
    
    base_url = f"http://{settings.host}:{settings.port}"
    
    print("📍 Available Endpoints:")
    print(f"  • Application: {base_url}/")
    print(f"  • Health Check: {base_url}/healthz")
    print(f"  • Readiness: {base_url}/readyz")
    
    if settings.debug:
        print(f"  • API Docs: {base_url}/docs")
        print(f"  • ReDoc: {base_url}/redoc")
        print(f"  • OpenAPI JSON: {base_url}{settings.api_v1_prefix}/openapi.json")
    
    if settings.prometheus_metrics_enabled:
        print(f"  • Metrics: {base_url}/metrics")
    
    print(f"  • API v1: {base_url}{settings.api_v1_prefix}")
    print(f"    - Auth: {base_url}{settings.api_v1_prefix}/auth")
    print(f"    - Users: {base_url}{settings.api_v1_prefix}/users")
    
    if settings.feature_websocket:
        ws_url = f"ws://{settings.host}:{settings.port}"
        print(f"    - WebSocket: {ws_url}{settings.api_v1_prefix}/ws/connect")
    
    print("-"*60)
    print("⚙️  Configuration:")
    print(f"  • Database: {settings.database_url_str[:50]}..." if settings.database_url_str else "  • Database: Not configured")
    print(f"  • Redis: {settings.redis_url_str[:50]}..." if settings.redis_url_str else "  • Redis: Not configured")
    print(f"  • JWT Secret: {'*' * 20}[HIDDEN]")
    print(f"  • CORS Origins: {settings.cors_origins}")
    
    print("-"*60)
    print("🛠️  Development Commands:")
    print("  • Run tests: python -m pytest")
    print("  • Run migrations: python scripts/migrate.py")
    print("  • Format code: ruff format . && black .")
    print("  • Type check: mypy .")
    print("  • Lint: ruff check .")
    print("="*60)
    print()


async def run_development_server():
    """Run the development server with proper setup."""
    logger.info("Starting Elite FastAPI development server...")
    
    # Check dependencies
    if not await check_dependencies():
        logger.error("Dependency check failed. Please fix the issues above.")
        return
    
    # Print startup information
    print_startup_info()
    
    # Run with uvicorn
    config = uvicorn.Config(
        app="app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_dirs=["app", "scripts"],
        log_config=None,  # Use our loguru setup
        access_log=False,  # Use our middleware
        server_header=False,
        date_header=False,
    )
    
    server = uvicorn.Server(config)
    
    try:
        await server.serve()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


def main():
    """Main entry point."""
    try:
        # Ensure we're in the right directory
        os.chdir(project_root)
        
        # Run the server
        asyncio.run(run_development_server())
        
    except KeyboardInterrupt:
        print("\n👋 Development server stopped")
    except Exception as e:
        logger.error(f"Failed to start development server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()