"""One API process owns the repeating job-board sync.

Migrations still run in every process. Alembic locks its version table, so two
instances starting together do not both apply the same revision. Seeds are
idempotent and stay in every process so a follower is not missing them if it
serves a request before the leader finishes. The job sync loop is the work
that must not run twice.
"""

from __future__ import annotations

import fcntl
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.config import settings
from app.db import engine


class ProcessLeader:
    def __init__(self) -> None:
        self._file = None
        self._connection: Connection | None = None

    def acquire(self) -> bool:
        if engine.dialect.name == "postgresql":
            connection = engine.connect()
            locked = connection.execute(text("SELECT pg_try_advisory_lock(8675309)")).scalar()
            if not locked:
                connection.close()
                return False
            self._connection = connection
            return True

        path = Path(settings.upload_dir) / ".caisbe-leader.lock"
        path.parent.mkdir(parents=True, exist_ok=True)
        handle = path.open("a+")
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            handle.close()
            return False
        self._file = handle
        return True

    def release(self) -> None:
        if self._connection is not None:
            self._connection.close()
            self._connection = None
        if self._file is not None:
            self._file.close()
            self._file = None
