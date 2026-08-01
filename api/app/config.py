from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_allowed_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002"
    )
    jwt_secret: str = "change-me-in-production-use-a-long-random-string"
    jwt_expire_minutes: int = 60 * 24 * 7
    database_url: str = "sqlite:///./caisbe.db"
    admin_email: str = "admin@caisbe.org"
    admin_password: str = "adminpass123"
    admin_full_name: str = "CAISBE Admin"
    upload_dir: str = "./uploads"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
