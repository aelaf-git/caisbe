"""Prove the Alembic revisions describe the same tables as the models.

The rest of the suite builds SQLite with SQLAlchemy create_all, so a model
change with no migration still passes. This test walks every upgrade() and
compares column names. The historical revisions use Postgres ALTER syntax, so
they are not executed on SQLite here.
"""

from __future__ import annotations

import ast
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.db import Base

API_ROOT = Path(__file__).resolve().parents[1]


def _column_name(node: ast.AST) -> str | None:
    if not isinstance(node, ast.Call):
        return None
    func = node.func
    if not isinstance(func, ast.Attribute) or func.attr != "Column":
        return None
    if not node.args or not isinstance(node.args[0], ast.Constant):
        return None
    if not isinstance(node.args[0].value, str):
        return None
    return node.args[0].value


def _string_arg(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _apply_upgrade(node: ast.AST, tables: dict[str, set[str]]) -> None:
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        name = node.func.attr
        if name == "create_table":
            table = _string_arg(node.args[0]) if node.args else None
            if table:
                columns = tables.setdefault(table, set())
                for arg in node.args[1:]:
                    column = _column_name(arg)
                    if column:
                        columns.add(column)
        elif name == "add_column" and len(node.args) >= 2:
            table = _string_arg(node.args[0])
            column = _column_name(node.args[1])
            if table and column:
                tables.setdefault(table, set()).add(column)
        elif name == "drop_column" and len(node.args) >= 2:
            table = _string_arg(node.args[0])
            column = _string_arg(node.args[1])
            if table and column:
                tables.get(table, set()).discard(column)
        elif name == "drop_table" and node.args:
            table = _string_arg(node.args[0])
            if table:
                tables.pop(table, None)
    for child in ast.iter_child_nodes(node):
        _apply_upgrade(child, tables)


def _migrated_columns() -> dict[str, set[str]]:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "alembic"))
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = list(script.walk_revisions("base", heads[0]))
    revisions.reverse()
    tables: dict[str, set[str]] = {}
    for revision in revisions:
        tree = ast.parse(Path(revision.path).read_text())
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name == "upgrade":
                _apply_upgrade(node, tables)
    return tables


def test_model_columns_match_alembic_upgrades() -> None:
    migrated = _migrated_columns()
    mismatches: list[str] = []
    for table_name, table in sorted(Base.metadata.tables.items()):
        model_columns = set(table.columns.keys())
        revision_columns = migrated.get(table_name)
        if revision_columns is None:
            mismatches.append(f"{table_name}: no create_table in upgrades")
            continue
        missing = model_columns - revision_columns
        extra = revision_columns - model_columns
        if missing or extra:
            mismatches.append(f"{table_name}: model-only {sorted(missing)} migration-only {sorted(extra)}")
    assert not mismatches, "\n".join(mismatches)
