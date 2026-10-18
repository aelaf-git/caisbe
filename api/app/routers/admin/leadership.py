from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LeadershipPerson, User
from app.routers.admin.router import router
from app.schemas.leadership import (
    LeadershipPersonCreateIn,
    LeadershipPersonOut,
    LeadershipPersonUpdateIn,
)
from app.security.auth import require_admin

_OPTIONAL_STR_KEYS = {"credentials", "bio", "email", "photo_url"}


def _clean_optional_str(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


@router.get("/leadership", response_model=list[LeadershipPersonOut])
def admin_list_leadership(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[LeadershipPersonOut]:
    rows = (
        db.query(LeadershipPerson)
        .order_by(LeadershipPerson.sort_order.asc(), LeadershipPerson.id.asc())
        .all()
    )
    return [LeadershipPersonOut.model_validate(row) for row in rows]


@router.post("/leadership", response_model=LeadershipPersonOut, status_code=status.HTTP_201_CREATED)
def admin_create_leadership(
    payload: LeadershipPersonCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LeadershipPersonOut:
    row = LeadershipPerson(
        name=payload.name.strip(),
        role=payload.role.strip(),
        credentials=_clean_optional_str(payload.credentials),
        bio=_clean_optional_str(payload.bio),
        email=_clean_optional_str(payload.email),
        photo_url=_clean_optional_str(payload.photo_url),
        published=payload.published,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return LeadershipPersonOut.model_validate(row)


@router.patch("/leadership/{person_id}", response_model=LeadershipPersonOut)
def admin_update_leadership(
    person_id: int,
    payload: LeadershipPersonUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LeadershipPersonOut:
    row = db.query(LeadershipPerson).filter(LeadershipPerson.id == person_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leadership person not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in _OPTIONAL_STR_KEYS:
            setattr(row, key, _clean_optional_str(value if isinstance(value, str) else value))
            continue
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Name and role are required.",
                )
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return LeadershipPersonOut.model_validate(row)


@router.delete("/leadership/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_leadership(
    person_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(LeadershipPerson).filter(LeadershipPerson.id == person_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leadership person not found")
    db.delete(row)
    db.commit()
