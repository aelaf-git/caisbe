"""Discussion forum: public reading, member posts, and admin moderation."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db import get_db
from app.models import ForumBoard, ForumCategory, ForumReply, ForumThread, User
from app.schemas.forum import (
    ForumAdminThreadDetail,
    ForumAdminThreadSummary,
    ForumBoardDetail,
    ForumBoardSummary,
    ForumCategoryOut,
    ForumModerateUpdate,
    ForumReplyCreate,
    ForumReplyModerateUpdate,
    ForumReplyOut,
    ForumThreadCreate,
    ForumThreadDetail,
    ForumThreadSummary,
)
from app.security.auth import get_current_user, require_admin
from app.security.html_sanitize import strip_plain_text
from app.security.limiter import limiter

router = APIRouter(tags=["forum"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _author_name(user: User | None) -> str:
    if user is None:
        return "Member"
    return (user.full_name or "").strip() or "Member"


def _author_email(user: User | None) -> str:
    if user is None:
        return ""
    return user.email or ""


def _clean_title(value: str) -> str:
    clean = " ".join((strip_plain_text(value) or "").split())
    if len(clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is too short.")
    if len(clean) > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is too long.")
    return clean


def _clean_body(value: str) -> str:
    clean = (strip_plain_text(value) or "").strip()
    if not clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discussion cannot be empty.")
    if len(clean) > 8000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discussion is too long.")
    return clean


def _board_or_404(db: Session, slug: str) -> ForumBoard:
    board = (
        db.query(ForumBoard)
        .options(joinedload(ForumBoard.category))
        .filter(ForumBoard.slug == slug)
        .first()
    )
    if board is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found.")
    return board


def _load_thread(db: Session, thread_id: int) -> ForumThread | None:
    return (
        db.query(ForumThread)
        .options(
            joinedload(ForumThread.author),
            joinedload(ForumThread.board).joinedload(ForumBoard.category),
            selectinload(ForumThread.replies).selectinload(ForumReply.author),
        )
        .filter(ForumThread.id == thread_id)
        .first()
    )


def _reply_counts(db: Session, thread_ids: list[int], *, include_hidden: bool) -> dict[int, int]:
    if not thread_ids:
        return {}
    query = db.query(ForumReply.thread_id, func.count(ForumReply.id)).filter(
        ForumReply.thread_id.in_(thread_ids)
    )
    if not include_hidden:
        query = query.filter(ForumReply.hidden.is_(False))
    return dict(query.group_by(ForumReply.thread_id).all())


def _thread_summary(thread: ForumThread, reply_count: int) -> ForumThreadSummary:
    return ForumThreadSummary(
        id=thread.id,
        title=thread.title,
        author_name=_author_name(thread.author),
        pinned=thread.pinned,
        locked=thread.locked,
        hidden=thread.hidden,
        reply_count=reply_count,
        created_at=thread.created_at,
        last_activity_at=thread.last_activity_at,
    )


def _reply_out(row: ForumReply) -> ForumReplyOut:
    return ForumReplyOut(
        id=row.id,
        author_name=_author_name(row.author),
        body=row.body,
        hidden=row.hidden,
        created_at=row.created_at,
    )


def _thread_detail(thread: ForumThread, *, include_hidden_replies: bool) -> ForumThreadDetail:
    board = thread.board
    category = board.category if board is not None else None
    replies = list(thread.replies or [])
    if not include_hidden_replies:
        replies = [row for row in replies if not row.hidden]
    return ForumThreadDetail(
        id=thread.id,
        board_slug=board.slug if board is not None else "",
        board_title=board.title if board is not None else "",
        category_title=category.title if category is not None else "",
        title=thread.title,
        body=thread.body,
        author_name=_author_name(thread.author),
        pinned=thread.pinned,
        locked=thread.locked,
        hidden=thread.hidden,
        member_can_start=bool(board.member_can_start) if board is not None else False,
        created_at=thread.created_at,
        last_activity_at=thread.last_activity_at,
        replies=[_reply_out(row) for row in replies],
    )


def _admin_detail(thread: ForumThread) -> ForumAdminThreadDetail:
    base = _thread_detail(thread, include_hidden_replies=True)
    return ForumAdminThreadDetail(
        **base.model_dump(),
        author_email=_author_email(thread.author),
    )


def _visible_thread_counts(db: Session) -> dict[int, int]:
    rows = (
        db.query(ForumThread.board_id, func.count(ForumThread.id))
        .filter(ForumThread.hidden.is_(False))
        .group_by(ForumThread.board_id)
        .all()
    )
    return dict(rows)


def _categories(db: Session) -> list[ForumCategoryOut]:
    """Public directory: board names and descriptions only, never discussion titles."""
    categories = (
        db.query(ForumCategory)
        .options(selectinload(ForumCategory.boards))
        .order_by(ForumCategory.sort_order, ForumCategory.id)
        .all()
    )
    counts = _visible_thread_counts(db)
    payload: list[ForumCategoryOut] = []
    for category in categories:
        boards = sorted(category.boards, key=lambda board: (board.sort_order, board.id))
        payload.append(
            ForumCategoryOut(
                id=category.id,
                slug=category.slug,
                title=category.title,
                sort_order=category.sort_order,
                boards=[
                    ForumBoardSummary(
                        id=board.id,
                        slug=board.slug,
                        title=board.title,
                        description=board.description,
                        member_can_start=board.member_can_start,
                        sort_order=board.sort_order,
                        thread_count=counts.get(board.id, 0),
                        last_activity_at=None,
                        last_thread_title=None,
                    )
                    for board in boards
                ],
            )
        )
    return payload


def _create_thread(db: Session, *, board: ForumBoard, author: User, title: str, body: str) -> ForumThread:
    now = _now()
    thread = ForumThread(
        board_id=board.id,
        author_id=author.id,
        title=_clean_title(title),
        body=_clean_body(body),
        created_at=now,
        updated_at=now,
        last_activity_at=now,
    )
    db.add(thread)
    db.commit()
    loaded = _load_thread(db, thread.id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to save discussion.")
    return loaded


def _create_reply(db: Session, *, thread: ForumThread, author: User, body: str) -> ForumReply:
    now = _now()
    reply = ForumReply(
        thread_id=thread.id,
        author_id=author.id,
        body=_clean_body(body),
        created_at=now,
    )
    thread.last_activity_at = now
    thread.updated_at = now
    db.add(reply)
    db.commit()
    db.refresh(reply)
    reply.author = author
    return reply


@router.get("/forum/categories", response_model=list[ForumCategoryOut])
def list_forum_categories(db: Session = Depends(get_db)) -> list[ForumCategoryOut]:
    return _categories(db)


@router.get("/forum/boards/{slug}", response_model=ForumBoardDetail)
def get_forum_board(
    slug: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ForumBoardDetail:
    board = _board_or_404(db, slug)
    threads = (
        db.query(ForumThread)
        .options(joinedload(ForumThread.author))
        .filter(ForumThread.board_id == board.id, ForumThread.hidden.is_(False))
        .order_by(ForumThread.pinned.desc(), ForumThread.last_activity_at.desc(), ForumThread.id.desc())
        .all()
    )
    counts = _reply_counts(db, [row.id for row in threads], include_hidden=False)
    category = board.category
    return ForumBoardDetail(
        id=board.id,
        slug=board.slug,
        title=board.title,
        description=board.description,
        member_can_start=board.member_can_start,
        category_slug=category.slug if category is not None else "",
        category_title=category.title if category is not None else "",
        threads=[_thread_summary(row, counts.get(row.id, 0)) for row in threads],
    )


@router.get("/forum/threads/{thread_id}", response_model=ForumThreadDetail)
def get_forum_thread(
    thread_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ForumThreadDetail:
    thread = _load_thread(db, thread_id)
    if thread is None or thread.hidden:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    return _thread_detail(thread, include_hidden_replies=False)


@router.post("/forum/boards/{slug}/threads", response_model=ForumThreadDetail, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_forum_thread(
    slug: str,
    request: Request,
    payload: ForumThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ForumThreadDetail:
    board = _board_or_404(db, slug)
    if not board.member_can_start:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can start a discussion in this board.",
        )
    thread = _create_thread(db, board=board, author=current_user, title=payload.title, body=payload.body)
    return _thread_detail(thread, include_hidden_replies=False)


@router.post(
    "/forum/threads/{thread_id}/replies",
    response_model=ForumReplyOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("40/minute")
def create_forum_reply(
    thread_id: int,
    request: Request,
    payload: ForumReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ForumReplyOut:
    thread = _load_thread(db, thread_id)
    if thread is None or thread.hidden:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    if thread.locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This discussion is locked.")
    reply = _create_reply(db, thread=thread, author=current_user, body=payload.body)
    return _reply_out(reply)


@router.get("/admin/forum/categories", response_model=list[ForumCategoryOut])
def admin_list_categories(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ForumCategoryOut]:
    return _categories(db)


@router.get("/admin/forum/threads", response_model=list[ForumAdminThreadSummary])
def admin_list_threads(
    board_slug: str | None = Query(default=None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ForumAdminThreadSummary]:
    query = (
        db.query(ForumThread)
        .options(joinedload(ForumThread.author), joinedload(ForumThread.board))
        .order_by(ForumThread.last_activity_at.desc(), ForumThread.id.desc())
    )
    if board_slug:
        board = _board_or_404(db, board_slug)
        query = query.filter(ForumThread.board_id == board.id)
    threads = query.all()
    counts = _reply_counts(db, [row.id for row in threads], include_hidden=True)
    payload: list[ForumAdminThreadSummary] = []
    for row in threads:
        summary = _thread_summary(row, counts.get(row.id, 0))
        board = row.board
        payload.append(
            ForumAdminThreadSummary(
                **summary.model_dump(),
                board_slug=board.slug if board is not None else "",
                board_title=board.title if board is not None else "",
                author_email=_author_email(row.author),
            )
        )
    return payload


@router.get("/admin/forum/threads/{thread_id}", response_model=ForumAdminThreadDetail)
def admin_get_thread(
    thread_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ForumAdminThreadDetail:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    return _admin_detail(thread)


@router.patch("/admin/forum/threads/{thread_id}", response_model=ForumAdminThreadDetail)
def admin_moderate_thread(
    thread_id: int,
    payload: ForumModerateUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ForumAdminThreadDetail:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    if "pinned" in data:
        thread.pinned = bool(data["pinned"])
    if "locked" in data:
        thread.locked = bool(data["locked"])
    if "hidden" in data:
        thread.hidden = bool(data["hidden"])
    thread.updated_at = _now()
    db.commit()
    loaded = _load_thread(db, thread.id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    return _admin_detail(loaded)


@router.patch("/admin/forum/replies/{reply_id}", response_model=ForumAdminThreadDetail)
def admin_moderate_reply(
    reply_id: int,
    payload: ForumReplyModerateUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ForumAdminThreadDetail:
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if reply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found.")
    reply.hidden = payload.hidden
    db.commit()
    thread = _load_thread(db, reply.thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    return _admin_detail(thread)


@router.post(
    "/admin/forum/boards/{slug}/threads",
    response_model=ForumAdminThreadDetail,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_thread(
    slug: str,
    payload: ForumThreadCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ForumAdminThreadDetail:
    board = _board_or_404(db, slug)
    thread = _create_thread(db, board=board, author=current_user, title=payload.title, body=payload.body)
    return _admin_detail(thread)


@router.post(
    "/admin/forum/threads/{thread_id}/replies",
    response_model=ForumAdminThreadDetail,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_reply(
    thread_id: int,
    payload: ForumReplyCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ForumAdminThreadDetail:
    thread = _load_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    _create_reply(db, thread=thread, author=current_user, body=payload.body)
    loaded = _load_thread(db, thread.id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found.")
    return _admin_detail(loaded)
