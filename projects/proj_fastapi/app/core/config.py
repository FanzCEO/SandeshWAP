from pydantic_settings import BaseSettings
from pydantic import AnyUrl, field_validator
from typing import List, Union

class Settings(BaseSettings):
    # Application settings
    app_name: str = "FANZ FastAPI"
    app_version: str = "0.1.0"
    app_env: str = "dev"
    
    # Database and external services  
    database_url: Union[AnyUrl, str] = "postgresql://localhost/defaultdb"  # Will be overridden by env
    redis_url: AnyUrl | None = None
    jwt_secret: str = "default-jwt-secret"  # Will be overridden by env
    cors_origins: str = "http://localhost:3000"
    
    # Model config for Pydantic v2
    model_config = {"env_file": ".env"}
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8080
    api_v1_prefix: str = "/api"
    feature_websocket: bool = True
    
    # Observability settings
    otel_environment: str = "development"
    log_format: str = "colored"
    log_level: str = "INFO"
    opentelemetry_endpoint: str | None = None
    otel_service_name: str = "fanz-fastapi"
    prometheus_metrics_enabled: bool = True
    
    # Database settings
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10
    debug: bool = False
    testing: bool = False
    
    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in ["production", "prod"]
    
    @property
    def database_url_str(self) -> str:
        return str(self.database_url)
    
    @property
    def redis_url_str(self) -> str | None:
        return str(self.redis_url) if self.redis_url else None

    @property
    def cors_list(self) -> List[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


def get_settings() -> Settings:
    """Create settings instance with environment variable loading."""
    return Settings()

# Global settings instance
settings = get_settings()