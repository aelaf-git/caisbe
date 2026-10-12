from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Seminar, User
from app.routers.admin.router import router
from app.schemas.seminars import SeminarCreateIn, SeminarOut, SeminarUpdateIn
from app.security.auth import require_admin


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
    row = Seminar(
        title=payload.title.strip(),
        description=payload.description.strip(),
        published=payload.published,
        sort_order=payload.sort_order,
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
        if isinstance(value, str):
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
