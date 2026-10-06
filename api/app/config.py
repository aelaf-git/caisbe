from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change-me-in-production-use-a-long-random-string"


def normalize_database_url(url: str) -> str:
    """Accept Render/Heroku-style postgres:// URLs for SQLAlchemy + psycopg."""
    value = url.strip()
    if value.startswith("postgres://"):
        value = "postgresql://" + value[len("postgres://") :]
    if value.startswith("postgresql://") and "+psycopg" not in value.split("://", 1)[0]:
        value = "postgresql+psycopg://" + value[len("postgresql://") :]
    return value


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
    # S3-compatible object storage (Cloudflare R2, AWS S3, etc.).
    # When all of endpoint/bucket/keys/public_base_url are set, uploads go there.
    # Otherwise files stay on local/Render disk under UPLOAD_DIR.
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_public_base_url: str = ""
    s3_region: str = "auto"
    portal_public_url: str = "http://localhost:3002"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    # Resend (newsletters + all transactional email). Leave empty in dev to log instead of send.
    resend_api_key: str = ""
    # Fallback From if a purpose-specific address is unset (domain must be verified in Resend).
    email_from: str = "CAISBE <noreply@caisbe.org>"
    email_from_newsletter: str = "CAISBE Newsletter <newsletter@caisbe.org>"
    email_from_contact: str = "CAISBE <contact@caisbe.org>"
    email_from_info: str = "CAISBE <info@caisbe.org>"
    email_from_system: str = "CAISBE <noreply@caisbe.org>"
    # Automatic job board sync (curated feed + optional Adzuna / Arbeitnow).
    job_sync_enabled: bool = True
    job_sync_interval_hours: int = 12
    job_sync_on_startup: bool = True
    job_sync_expiry_days: int = 45
    job_feed_url: str = ""
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_country: str = "ca"

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str) and value.strip():
            return normalize_database_url(value)
        return value

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
