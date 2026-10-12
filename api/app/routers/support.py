"""Student ↔ admin support messaging (near real-time via polling)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import SupportMessage, SupportThread, User
from app.schemas.support import (
    SupportMessageCreate,
    SupportMessageOut,
    SupportThreadCreate,
    SupportThreadOut,
    SupportThreadStatusUpdate,
    SupportUnreadOut,
)
from app.security.auth import get_current_user, require_admin
from app.security.html_sanitize import strip_plain_text
from app.security.limiter import limiter
from app.services.notifications import notify_users
from fastapi import Request

router = APIRouter(tags=["support"])

ALLOWED_KINDS = {"question", "issue", "general"}
ALLOWED_STATUSES = {"open", "waiting_admin", "waiting_student", "closed"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _notify_admins(db: Session, *, title: str, body: str) -> None:
    admin_ids = [row[0] for row in db.query(User.id).filter(User.role == "admin").all()]
    if not admin_ids:
        return
    notify_users(db, admin_ids, title=title, body=body, kind="support", link="/support")


def _message_out(row: SupportMessage) -> SupportMessageOut:
    sender = row.sender
    return SupportMessageOut(
        id=row.id,
        thread_id=row.thread_id,
        sender_user_id=row.sender_user_id,
        sender_name=sender.full_name if sender else "",
        body=row.body,
        is_from_admin=row.is_from_admin,
        created_at=row.created_at,
        read_at=row.read_at,
    )


def _thread_out(
    thread: SupportThread,
    *,
    for_admin: bool,
    include_messages: bool = False,
) -> SupportThreadOut:
    messages = list(thread.messages or [])
    unread = 0
    for msg in messages:
        if msg.read_at is not None:
            continue
        if for_admin and not msg.is_from_admin:
            unread += 1
        elif not for_admin and msg.is_from_admin:
            unread += 1
    preview = ""
    if messages:
        preview = (messages[-1].body or "").strip().replace("\n", " ")[:140]
    student = thread.user
    out = SupportThreadOut(
        id=thread.id,
        user_id=thread.user_id,
        student_name=student.full_name if student else "",
        student_email=student.email if student else "",
        subject=thread.subject,
        kind=thread.kind if thread.kind in ALLOWED_KINDS else "general",  # type: ignore[arg-type]
        status=thread.status if thread.status in ALLOWED_STATUSES else "open",  # type: ignore[arg-type]
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        last_message_at=thread.last_message_at,
        unread_count=unread,
        last_preview=preview,
        messages=[_message_out(m) for m in messages] if include_messages else [],
    )
    return out


def _load_thread(db: Session, thread_id: int) -> SupportThread | None:
    return (
        db.query(SupportThread)
        .options(
            joinedload(SupportThread.user),
            joinedload(SupportThread.messages).joinedload(SupportMessage.sender),
        )
        .filter(SupportThread.id == thread_id)
        .first()
    )


def _append_message(
    db: Session,
    *,
    thread: SupportThread,
    sender: User,
    body: str,
    is_from_admin: bool,
) -> SupportMessage:
    clean = strip_plain_text(body).strip()
    if not clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")
    now = _now()
    msg = SupportMessage(
        thread_id=thread.id,
        sender_user_id=sender.id,
        body=clean[:8000],
        is_from_admin=is_from_admin,
        created_at=now,
        # read_at stays None until the recipient marks the thread read
        read_at=None,
    )
    db.add(msg)
    thread.last_message_at = now
    thread.updated_at = now
    if is_from_admin:
        if thread.status != "closed":
            thread.status = "waiting_student"
    else:
        if thread.status != "closed":
            thread.status = "waiting_admin"
    db.flush()
    return msg


# --- Student ---


@router.get("/me/support/unread", response_model=SupportUnreadOut)
def my_support_unread(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportUnreadOut:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    count = (
        db.query(SupportMessage)
        .join(SupportThread, SupportThread.id == SupportMessage.thread_id)
        .filter(
            SupportThread.user_id == current_user.id,
            SupportMessage.is_from_admin.is_(True),
            SupportMessage.read_at.is_(None),
        )
        .count()
    )
    return SupportUnreadOut(unread_count=count)


@router.get("/me/support/threads", response_model=list[SupportThreadOut])
def list_my_support_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SupportThreadOut]:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    rows = (
        db.query(SupportThread)
        .options(
            joinedload(SupportThread.user),
            joinedload(SupportThread.messages).joinedload(SupportMessage.sender),
        )
        .filter(SupportThread.user_id == current_user.id)
        .order_by(SupportThread.last_message_at.desc(), SupportThread.id.desc())
        .all()
    )
    return [_thread_out(row, for_admin=False) for row in rows]


@router.post("/me/support/threads", response_model=SupportThreadOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_support_thread(
    request: Request,
    payload: SupportThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    kind = payload.kind if payload.kind in ALLOWED_KINDS else "question"
    subject = strip_plain_text(payload.subject).strip()[:255]
    if len(subject) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject is required.")
    now = _now()
    thread = SupportThread(
        user_id=current_user.id,
        subject=subject,
        kind=kind,
        status="waiting_admin",
        created_at=now,
        updated_at=now,
        last_message_at=now,
    )
    db.add(thread)
    db.flush()
    _append_message(
        db,
        thread=thread,
        sender=current_user,
        body=payload.body,
        is_from_admin=False,
    )
    _notify_admins(
        db,
        title="New support message",
        body=f'{current_user.full_name} opened "{subject}" ({kind}).',
    )
    db.commit()
    loaded = _load_thread(db, thread.id)
    assert loaded is not None
    return _thread_out(loaded, for_admin=False, include_messages=True)


@router.get("/me/support/threads/{thread_id}", response_model=SupportThreadOut)
def get_my_support_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    thread = _load_thread(db, thread_id)
    if thread is None or thread.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return _thread_out(thread, for_admin=False, include_messages=True)


@router.get("/me/support/threads/{thread_id}/messages", response_model=list[SupportMessageOut])
def poll_my_support_messages(
    thread_id: int,
    after_id: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SupportMessageOut]:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()
    if thread is None or thread.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    rows = (
        db.query(SupportMessage)
        .options(joinedload(SupportMessage.sender))
        .filter(SupportMessage.thread_id == thread_id, SupportMessage.id > after_id)
        .order_by(SupportMessage.id.asc())
        .all()
    )
    return [_message_out(row) for row in rows]


@router.post(
    "/me/support/threads/{thread_id}/messages",
    response_model=SupportMessageOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("60/minute")
def reply_my_support_thread(
    request: Request,
    thread_id: int,
    payload: SupportMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportMessageOut:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    thread = _load_thread(db, thread_id)
    if thread is None or thread.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if thread.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This conversation is closed.")
    msg = _append_message(
        db,
        thread=thread,
        sender=current_user,
        body=payload.body,
        is_from_admin=False,
    )
    _notify_admins(
        db,
        title="Support reply",
        body=f'{current_user.full_name} replied in "{thread.subject}".',
    )
    db.commit()
    db.refresh(msg)
    msg = (
        db.query(SupportMessage)
        .options(joinedload(SupportMessage.sender))
        .filter(SupportMessage.id == msg.id)
        .one()
    )
    return _message_out(msg)


@router.post("/me/support/threads/{thread_id}/read", response_model=SupportThreadOut)
def mark_my_support_thread_read(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    thread = _load_thread(db, thread_id)
    if thread is None or thread.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    now = _now()
    for msg in thread.messages:
        if msg.is_from_admin and msg.read_at is None:
            msg.read_at = now
    db.commit()
    loaded = _load_thread(db, thread_id)
    assert loaded is not None
    return _thread_out(loaded, for_admin=False, include_messages=True)


# --- Admin ---


@router.get("/admin/support/threads", response_model=list[SupportThreadOut])
def admin_list_support_threads(
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SupportThreadOut]:
    query = db.query(SupportThread).options(
        joinedload(SupportThread.user),
        joinedload(SupportThread.messages).joinedload(SupportMessage.sender),
    )
    if status_filter and status_filter != "all":
        query = query.filter(SupportThread.status == status_filter)
    rows = query.order_by(SupportThread.last_message_at.desc(), SupportThread.id.desc()).limit(300).all()
    return [_thread_out(row, for_admin=True) for row in rows]


@router.get("/admin/support/unread", response_model=SupportUnreadOut)
def admin_support_unread(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SupportUnreadOut:
    count = (
        db.query(SupportMessage)
        .filter(SupportMessage.is_from_admin.is_(False), SupportMessage.read_at.is_(None))
        .count()
    )
    return SupportUnreadOut(unread_count=count)


@router.get("/admin/support/threads/{thread_id}", response_model=SupportThreadOut)
def admin_get_support_thread(
    thread_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return _thread_out(thread, for_admin=True, include_messages=True)


@router.get("/admin/support/threads/{thread_id}/messages", response_model=list[SupportMessageOut])
def admin_poll_support_messages(
    thread_id: int,
    after_id: int = Query(default=0, ge=0),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SupportMessageOut]:
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    rows = (
        db.query(SupportMessage)
        .options(joinedload(SupportMessage.sender))
        .filter(SupportMessage.thread_id == thread_id, SupportMessage.id > after_id)
        .order_by(SupportMessage.id.asc())
        .all()
    )
    return [_message_out(row) for row in rows]


@router.post(
    "/admin/support/threads/{thread_id}/messages",
    response_model=SupportMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_reply_support_thread(
    thread_id: int,
    payload: SupportMessageCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SupportMessageOut:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if thread.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This conversation is closed.")
    msg = _append_message(
        db,
        thread=thread,
        sender=admin,
        body=payload.body,
        is_from_admin=True,
    )
    notify_users(
        db,
        [thread.user_id],
        title="New support reply",
        body=f'Admin replied to "{thread.subject}".',
        kind="support",
        link="/messages",
    )
    db.commit()
    msg = (
        db.query(SupportMessage)
        .options(joinedload(SupportMessage.sender))
        .filter(SupportMessage.id == msg.id)
        .one()
    )
    return _message_out(msg)


@router.post("/admin/support/threads/{thread_id}/read", response_model=SupportThreadOut)
def admin_mark_support_thread_read(
    thread_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    now = _now()
    for msg in thread.messages:
        if not msg.is_from_admin and msg.read_at is None:
            msg.read_at = now
    db.commit()
    loaded = _load_thread(db, thread_id)
    assert loaded is not None
    return _thread_out(loaded, for_admin=True, include_messages=True)


@router.patch("/admin/support/threads/{thread_id}", response_model=SupportThreadOut)
def admin_update_support_thread(
    thread_id: int,
    payload: SupportThreadStatusUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SupportThreadOut:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    thread.status = payload.status
    thread.updated_at = _now()
    db.commit()
    loaded = _load_thread(db, thread_id)
    assert loaded is not None
    return _thread_out(loaded, for_admin=True, include_messages=True)
