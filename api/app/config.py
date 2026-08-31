from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change-me-in-production-use-a-long-random-string"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_allowed_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002"
    )
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_expire_minutes: int = 60 * 24 * 7
    database_url: str = "postgresql+psycopg://caisbe:caisbe@127.0.0.1:5433/caisbe"
    admin_email: str = "admin@caisbe.org"
    admin_password: str = "adminpass123"
    admin_full_name: str = "CAISBE Admin"
    upload_dir: str = "./uploads"
    portal_public_url: str = "http://localhost:3002"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"


settings = Settings()


def validate_production_settings() -> None:
    if settings.is_production and settings.jwt_secret == DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "Refusing to start in production with the default JWT_SECRET. "
            "Set a strong JWT_SECRET in the environment."
        )
