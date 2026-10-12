"""Ensure job sync never blocks FastAPI lifespan (login must stay reachable)."""

from __future__ import annotations

import ast
from pathlib import Path


def test_main_does_not_await_job_sync_before_yield() -> None:
    """Regression: awaiting sync_jobs in lifespan kept /api/login unreachable."""
    main_path = Path(__file__).resolve().parents[1] / "app" / "main.py"
    source = main_path.read_text(encoding="utf-8")
    tree = ast.parse(source)

    lifespan_fn = None
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "lifespan":
            lifespan_fn = node
            break
    assert lifespan_fn is not None, "lifespan() missing from main.py"

    # Disallow `await asyncio.to_thread(_run_job_sync)` (or await of _run_job_sync)
    # before the yield. Background create_task is required instead.
    saw_yield = False
    blocking_awaits: list[str] = []

    for node in ast.walk(lifespan_fn):
        if isinstance(node, ast.Yield):
            saw_yield = True
        if saw_yield:
            continue
        if not isinstance(node, ast.Await):
            continue
        awaited = ast.dump(node.value)
        if "_run_job_sync" in awaited or "sync_jobs" in awaited:
            blocking_awaits.append(awaited)

    assert not blocking_awaits, (
        "Job sync must not be awaited before lifespan yield; "
        f"found blocking await(s): {blocking_awaits}"
    )
    assert "create_task" in source
    assert "_run_job_sync" in source
