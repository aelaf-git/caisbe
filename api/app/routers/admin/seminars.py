from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Seminar, SeminarRegistration, User
from app.routers.admin.router import router
from app.schemas.seminars import (
    SeminarCreateIn,
    SeminarOut,
    SeminarRegistrationOut,
    SeminarUpdateIn,
)
from app.security.auth import require_admin

_OPTIONAL_STR = {
    "cover_url",
    "event_date_label",
    "event_time_label",
    "event_format_label",
    "venue_address",
    "online_join_url",
}


def _clean_str(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


@router.get("/seminars", response_model=list[SeminarOut])
def admin_list_seminars(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SeminarOut]:
    rows = db.query(Seminar).order_by(Seminar.sort_order.asc(), Seminar.id.asc()).all()
    return [SeminarOut.model_validate(row) for row in rows]


@router.post("/seminars", response_model=SeminarOut, status_code=status.HTTP_201_CREATED)
def admin_create_seminar(
    payload: SeminarCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SeminarOut:
    data = payload.model_dump()
    row = Seminar(
        title=data["title"].strip(),
        description=data["description"].strip(),
        cover_url=_clean_str(data.get("cover_url")),
        event_date_label=_clean_str(data.get("event_date_label")),
        event_time_label=_clean_str(data.get("event_time_label")),
        event_format_label=_clean_str(data.get("event_format_label")),
        venue_address=_clean_str(data.get("venue_address")),
        online_join_url=_clean_str(data.get("online_join_url")),
        event_starts_at=data.get("event_starts_at"),
        registration_closes_at=data.get("registration_closes_at"),
        registration_enabled=bool(data.get("registration_enabled", True)),
        member_price_cents=int(data.get("member_price_cents") or 5000),
        non_member_price_cents=int(data.get("non_member_price_cents") or 7500),
        student_price_cents=int(data.get("student_price_cents") or 4000),
        capacity_in_person=data.get("capacity_in_person"),
        capacity_virtual=data.get("capacity_virtual"),
        published=bool(data.get("published", True)),
        sort_order=int(data.get("sort_order") or 0),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SeminarOut.model_validate(row)


@router.patch("/seminars/{seminar_id}", response_model=SeminarOut)
def admin_update_seminar(
    seminar_id: int,
    payload: SeminarUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SeminarOut:
    row = db.query(Seminar).filter(Seminar.id == seminar_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in _OPTIONAL_STR:
            setattr(row, key, _clean_str(value if isinstance(value, str) else value))
            continue
        if key in ("title", "description") and isinstance(value, str):
            value = value.strip()
            if not value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Title and description are required.",
                )
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return SeminarOut.model_validate(row)


@router.delete("/seminars/{seminar_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_seminar(
    seminar_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(Seminar).filter(Seminar.id == seminar_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    db.delete(row)
    db.commit()


@router.get(
    "/seminars/{seminar_id}/registrations",
    response_model=list[SeminarRegistrationOut],
)
def admin_list_seminar_registrations(
    seminar_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SeminarRegistrationOut]:
    seminar = db.query(Seminar).filter(Seminar.id == seminar_id).first()
    if not seminar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    rows = (
        db.query(SeminarRegistration)
        .filter(SeminarRegistration.seminar_id == seminar_id)
        .order_by(SeminarRegistration.created_at.desc())
        .all()
    )
    return [SeminarRegistrationOut.model_validate(row) for row in rows]
