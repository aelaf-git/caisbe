from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, inspect, pool, text

from app.config import settings
from app.db import Base
from app import models  # noqa: F401 — register models on metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return settings.database_url


def _widen_alembic_version_num(connection) -> None:
    """Alembic defaults version_num to VARCHAR(32); longer revision ids must fit."""
    if connection.dialect.name != "postgresql":
        return
    if not inspect(connection).has_table("alembic_version"):
        return
    connection.execute(
        text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)")
    )
    connection.commit()


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        if connection.dialect.name == "sqlite":
            # A few revisions insert rows into tables whose default is now().
            # Postgres provides that function; SQLite needs it registered so the
            # same migrations can be checked off Postgres.
            dbapi = connection.connection.dbapi_connection
            dbapi.create_function("now", 0, lambda: "2000-01-01 00:00:00")
        _widen_alembic_version_num(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            transaction_per_migration=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
