"""Admin editing of hand-written French content."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.routers.admin.router import router
from app.security.auth import require_admin
from app.services.translations import (
    ALLOWED_FIELDS,
    get_translation,
    require_entity_type,
    save_translation,
    translation_lang,
)


class TranslationIn(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)


class TranslationOut(BaseModel):
    entity_type: str
    entity_id: int
    lang: str
    allowed_fields: list[str]
    fields: dict[str, Any]


def _lang(value: str) -> str:
    code = translation_lang(value)
    if code is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a language other than English.")
    return code


@router.get("/translations/{entity_type}/{entity_id}", response_model=TranslationOut)
def admin_get_translation(
    entity_type: str,
    entity_id: int,
    lang: str = Query(default="fr", max_length=8),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TranslationOut:
    kind = require_entity_type(entity_type)
    code = _lang(lang)
    return TranslationOut(
        entity_type=kind,
        entity_id=entity_id,
        lang=code,
        allowed_fields=list(ALLOWED_FIELDS[kind]),
        fields=get_translation(db, kind, entity_id, code),
    )


@router.put("/translations/{entity_type}/{entity_id}", response_model=TranslationOut)
def admin_save_translation(
    entity_type: str,
    entity_id: int,
    payload: TranslationIn,
    lang: str = Query(default="fr", max_length=8),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TranslationOut:
    kind = require_entity_type(entity_type)
    code = _lang(lang)
    saved = save_translation(db, kind, entity_id, code, payload.fields)
    return TranslationOut(
        entity_type=kind,
        entity_id=entity_id,
        lang=code,
        allowed_fields=list(ALLOWED_FIELDS[kind]),
        fields=saved,
    )
