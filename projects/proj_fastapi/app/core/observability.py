"""Observability setup with OpenTelemetry and Prometheus metrics."""

import logging
import time
from typing import Optional

from fastapi import Request, Response
from loguru import logger
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import Counter, Histogram, Info, generate_latest

from app.core.config import settings

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

DATABASE_OPERATIONS = Counter(
    'database_operations_total',
    'Total database operations',
    ['operation', 'table', 'status']
)

REDIS_OPERATIONS = Counter(
    'redis_operations_total',
    'Total Redis operations',
    ['operation', 'status']
)

ACTIVE_CONNECTIONS = Histogram(
    'active_connections',
    'Active database connections'
)

ERROR_RATE = Counter(
    'errors_total',
    'Total application errors',
    ['error_type', 'endpoint']
)

# Application info
APP_INFO = Info('app_info', 'Application information')
APP_INFO.info({
    'name': settings.app_name,
    'version': settings.app_version,
    'environment': settings.otel_environment
})


class LoguruHandler(logging.Handler):
    """Handler to integrate standard logging with loguru."""
    
    def emit(self, record):
        """Emit log record to loguru."""
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def setup_logging() -> None:
    """Configure loguru logging."""
    # Remove default handler
    logger.remove()
    
    # Add console handler with format based on settings
    if settings.log_format == "json":
        logger.add(
            sink=lambda message: print(message, end=""),
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
            level=settings.log_level,
            serialize=True,
            enqueue=True
        )
    else:
        logger.add(
            sink=lambda message: print(message, end=""),
            format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level=settings.log_level,
            colorize=True,
            enqueue=True
        )
    
    # Add file handler for errors
    logger.add(
        "logs/error.log",
        rotation="1 day",
        retention="30 days",
        level="ERROR",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        serialize=True,
        enqueue=True
    )
    
    # Intercept standard logging
    logging.basicConfig(handlers=[LoguruHandler()], level=0, force=True)


def setup_tracing() -> Optional[TracerProvider]:
    """Setup OpenTelemetry tracing."""
    if not settings.opentelemetry_endpoint:
        logger.info("OpenTelemetry endpoint not configured, skipping tracing setup")
        return None
    
    try:
        # Create resource
        resource = Resource.create({
            "service.name": settings.otel_service_name,
            "service.version": settings.app_version,
            "deployment.environment": settings.otel_environment,
        })
        
        # Create tracer provider
        tracer_provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(tracer_provider)
        
        # Create OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=str(settings.opentelemetry_endpoint),
            insecure=not settings.is_production
        )
        
        # Add span processor
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)
        
        logger.info("OpenTelemetry tracing initialized")
        return tracer_provider
        
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracing: {e}")
        return None


def setup_metrics() -> Optional[MeterProvider]:
    """Setup OpenTelemetry metrics."""
    if not settings.prometheus_metrics_enabled:
        logger.info("Prometheus metrics disabled")
        return None
    
    try:
        # Create resource
        resource = Resource.create({
            "service.name": settings.otel_service_name,
            "service.version": settings.app_version,
        })
        
        # Create meter provider
        meter_provider = MeterProvider(resource=resource)
        metrics.set_meter_provider(meter_provider)
        
        logger.info("OpenTelemetry metrics initialized")
        return meter_provider
        
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry metrics: {e}")
        return None


def instrument_app(app) -> None:
    """Instrument FastAPI app with OpenTelemetry."""
    try:
        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=trace.get_tracer_provider(),
            excluded_urls="/health,/healthz,/readyz,/metrics"
        )
        
        # Instrument SQLAlchemy
        SQLAlchemyInstrumentor().instrument(
            enable_commenter=True,
            commenter_options={"db_driver": True, "dbapi_level": True}
        )
        
        # Instrument Redis
        RedisInstrumentor().instrument()
        
        logger.info("Application instrumented with OpenTelemetry")
        
    except Exception as e:
        logger.error(f"Failed to instrument application: {e}")


class PrometheusMiddleware:
    """Middleware to collect Prometheus metrics."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Extract request info
        method = scope["method"]
        path = scope["path"]
        
        # Skip metrics for metrics endpoint
        if path in ["/metrics", "/healthz", "/readyz"]:
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        status_code = 200
        
        async def wrapped_send(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, wrapped_send)
        except Exception as e:
            status_code = 500
            ERROR_RATE.labels(
                error_type=type(e).__name__,
                endpoint=path
            ).inc()
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time
            
            REQUEST_COUNT.labels(
                method=method,
                endpoint=path,
                status_code=status_code
            ).inc()
            
            REQUEST_DURATION.labels(
                method=method,
                endpoint=path
            ).observe(duration)


def get_prometheus_metrics() -> str:
    """Get Prometheus metrics in text format."""
    return generate_latest().decode()


class DatabaseMetricsCollector:
    """Collect database-related metrics."""
    
    @staticmethod
    def record_operation(operation: str, table: str, success: bool = True):
        """Record database operation."""
        status = "success" if success else "error"
        DATABASE_OPERATIONS.labels(
            operation=operation,
            table=table,
            status=status
        ).inc()
    
    @staticmethod
    def record_connection_pool_size(size: int):
        """Record active database connections."""
        ACTIVE_CONNECTIONS.observe(size)


class RedisMetricsCollector:
    """Collect Redis-related metrics."""
    
    @staticmethod
    def record_operation(operation: str, success: bool = True):
        """Record Redis operation."""
        status = "success" if success else "error"
        REDIS_OPERATIONS.labels(
            operation=operation,
            status=status
        ).inc()


class StructuredLogger:
    """Enhanced logger with structured logging capabilities."""
    
    def __init__(self, name: str):
        self.logger = logger.bind(component=name)
    
    def info(self, message: str, **kwargs):
        """Log info with context."""
        self.logger.bind(**kwargs).info(message)
    
    def error(self, message: str, **kwargs):
        """Log error with context."""
        self.logger.bind(**kwargs).error(message)
    
    def warning(self, message: str, **kwargs):
        """Log warning with context."""
        self.logger.bind(**kwargs).warning(message)
    
    def debug(self, message: str, **kwargs):
        """Log debug with context."""
        self.logger.bind(**kwargs).debug(message)
    
    def audit(self, action: str, user_id: Optional[int] = None, **kwargs):
        """Log audit event."""
        self.logger.bind(
            event_type="audit",
            action=action,
            user_id=user_id,
            **kwargs
        ).info(f"Audit: {action}")
    
    def security(self, event: str, severity: str = "medium", **kwargs):
        """Log security event."""
        self.logger.bind(
            event_type="security",
            event=event,
            severity=severity,
            **kwargs
        ).warning(f"Security: {event}")


def get_logger(name: str) -> StructuredLogger:
    """Get structured logger for component."""
    return StructuredLogger(name)


# Performance monitoring
class PerformanceMonitor:
    """Monitor application performance."""
    
    @staticmethod
    def time_function(func_name: str):
        """Decorator to time function execution."""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                start = time.time()
                try:
                    result = await func(*args, **kwargs)
                    duration = time.time() - start
                    logger.info(f"Function {func_name} executed in {duration:.3f}s")
                    return result
                except Exception as e:
                    duration = time.time() - start
                    logger.error(f"Function {func_name} failed after {duration:.3f}s: {e}")
                    raise
            return wrapper
        return decorator


# Global instances
db_metrics = DatabaseMetricsCollector()
redis_metrics = RedisMetricsCollector()
performance_monitor = PerformanceMonitor()