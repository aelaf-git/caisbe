from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import PendingRegistration, SecurityQuestion, User
from app.schemas.auth import (
    PasswordChangeIn,
    ProfileUpdate,
    RegisterPendingOut,
    SecurityQuestionOut,
    SecurityQuestionsSaveIn,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmailIn,
)
from app.security.auth import (
    EMAIL_VERIFY_HOURS,
    create_access_token,
    get_current_user,
    hash_email_verify_token,
    hash_password,
    new_email_verify_token,
    verify_password,
)
from app.security.limiter import limiter
from app.services.commerce import apply_profile_fields, normalize_membership_type, profile_is_complete
from app.services.membership import (
    get_membership_certificate_type,
    get_pending_membership_application,
    is_student_membership,
    issue_membership_certificate,
    membership_is_accessible,
    record_membership_application,
)
from app.services.verify_email import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

_MEMBERSHIP_DOC_SUFFIXES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"}


def user_to_out(user: User, db: Session | None = None) -> UserOut:
    out = UserOut.model_validate(user)
    out.profile_completed = profile_is_complete(user)
    if db is not None:
        pending = get_pending_membership_application(db, user)
        if pending and not is_student_membership(pending.membership_type):
            cert_type = get_membership_certificate_type(db, pending.membership_type)
            details = (pending.details or "").lower()
            kind = "renewal" if "renewal" in details.split("\n", 1)[0] else "application"
            out.pending_membership_type = pending.membership_type
            out.pending_membership_kind = kind
            out.pending_membership_price_cents = cert_type.price_cents if cert_type else None
            out.pending_membership_currency = (cert_type.currency if cert_type else "cad") or "cad"
            out.pending_membership_label = (
                cert_type.label if cert_type else pending.membership_type.replace("-", " ").title()
            )
    return out


def _details_with_supporting_doc(
    details: str | None,
    *,
    label: str | None,
    original_name: str | None,
    file_url: str | None,
) -> str | None:
    base = (details or "").strip() or None
    if not file_url or not original_name:
        return base
    block = f"{(label or 'Supporting document').strip() or 'Supporting document'}: {original_name}\nFile: {file_url}"
    return f"{base}\n{block}".strip() if base else block


async def _parse_register_payload(
    request: Request,
) -> tuple[UserCreate, str | None, str | None, str | None]:
    """Return (payload, supporting_url, supporting_label, supporting_name)."""
    content_type = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" not in content_type:
        payload = UserCreate.model_validate(await request.json())
        return payload, None, None, None

    form = await request.form(max_part_size=20 * 1024 * 1024)
    payload = UserCreate(
        full_name=str(form.get("full_name") or ""),
        email=str(form.get("email") or ""),
        phone=str(form.get("phone") or ""),
        country=str(form.get("country") or ""),
        city=str(form.get("city") or ""),
        password=str(form.get("password") or ""),
        given_name=(str(form.get("given_name") or "").strip() or None),
        family_name=(str(form.get("family_name") or "").strip() or None),
        address=(str(form.get("address") or "").strip() or None),
        organization=(str(form.get("organization") or "").strip() or None),
        job_title=(str(form.get("job_title") or "").strip() or None),
        membership_type=(str(form.get("membership_type") or "").strip() or None),
        details=(str(form.get("details") or "").strip() or None),
    )
    supporting_url: str | None = None
    supporting_label: str | None = None
    supporting_name: str | None = None
    uploaded = form.get("supporting_document")
    if isinstance(uploaded, UploadFile) and (uploaded.filename or "").strip():
        from app.services.storage import save_upload

        supporting_label = (
            str(form.get("supporting_document_label") or "Supporting document").strip()
            or "Supporting document"
        )
        url, display = await save_upload(
            uploaded,
            allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
            max_bytes=20 * 1024 * 1024,
            folder="membership/supporting",
            invalid_detail="Upload a PDF, Word, or image file.",
            empty_detail="Uploaded file is empty.",
            too_large_detail="File is too large. Maximum size is 20 MB.",
        )
        supporting_url = url
        supporting_name = Path(uploaded.filename or display).name
    return payload, supporting_url, supporting_label, supporting_name


def _refresh_pending_verify_token(db: Session, pending: PendingRegistration) -> str:
    """Issue a new verify token on the pending row; return the raw token."""
    raw_token, token_hash = new_email_verify_token()
    pending.token_hash = token_hash
    pending.expires_at = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFY_HOURS)
    db.commit()
    db.refresh(pending)
    return raw_token


def _open_account_from_pending(db: Session, pending: PendingRegistration) -> User:
    now = datetime.now(timezone.utc)
    requested_type = (
        normalize_membership_type(pending.membership_type) if pending.membership_type else "student"
    )
    user = User(
        full_name=pending.full_name.strip(),
        email=pending.email,
        phone=pending.phone.strip(),
        country=pending.country.strip(),
        city=pending.city.strip(),
        given_name=(pending.given_name or "").strip() or None,
        family_name=(pending.family_name or "").strip() or None,
        address=(pending.address or "").strip() or None,
        organization=(pending.organization or "").strip() or None,
        job_title=(pending.job_title or "").strip() or None,
        hashed_password=pending.hashed_password,
        role="student",
        membership_type="student",
        membership_status="active",
        membership_date=now,
    )
    db.add(user)
    db.flush()
    issue_membership_certificate(db, user)

    details = _details_with_supporting_doc(
        pending.details,
        label=pending.supporting_document_label,
        original_name=pending.supporting_document_name,
        file_url=pending.supporting_document_url,
    )
    if requested_type != "student":
        record_membership_application(
            db,
            user,
            membership_type=requested_type,
            details=details or "New account",
            status_value="pending_payment",
        )
    elif details:
        record_membership_application(
            db,
            user,
            membership_type="student",
            details=details,
            status_value="active",
        )
    return user


@router.post("/register", response_model=RegisterPendingOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, db: Session = Depends(get_db)) -> RegisterPendingOut:
    payload, supporting_url, supporting_label, supporting_name = await _parse_register_payload(request)
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    raw_token, token_hash = new_email_verify_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFY_HOURS)

    db.query(PendingRegistration).filter(PendingRegistration.email == email).delete()
    pending = PendingRegistration(
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        country=payload.country.strip(),
        city=payload.city.strip(),
        hashed_password=hash_password(payload.password),
        given_name=(payload.given_name or "").strip() or None,
        family_name=(payload.family_name or "").strip() or None,
        address=(payload.address or "").strip() or None,
        organization=(payload.organization or "").strip() or None,
        job_title=(payload.job_title or "").strip() or None,
        membership_type=(
            normalize_membership_type(payload.membership_type) if payload.membership_type else "student"
        ),
        details=(payload.details or "").strip() or None,
        supporting_document_url=supporting_url,
        supporting_document_label=supporting_label,
        supporting_document_name=supporting_name,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(pending)
    db.commit()

    try:
        send_verification_email(
            to=email,
            full_name=pending.full_name,
            raw_token=raw_token,
            next_path="/membership",
        )
    except Exception as exc:
        db.query(PendingRegistration).filter(PendingRegistration.id == pending.id).delete()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We could not send the verification email. Please try again shortly.",
        ) from exc

    return RegisterPendingOut(
        message="Check your email to verify and open your account.",
        email=email,
    )


@router.post("/verify-email", response_model=TokenResponse)
@limiter.limit("20/minute")
def verify_email(
    request: Request,
    payload: VerifyEmailIn,
    db: Session = Depends(get_db),
) -> TokenResponse:
    token_hash = hash_email_verify_token(payload.token)
    pending = (
        db.query(PendingRegistration)
        .filter(PendingRegistration.token_hash == token_hash)
        .first()
    )
    if pending is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )
    expires_at = pending.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.delete(pending)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )

    existing = db.query(User).filter(User.email == pending.email).first()
    if existing:
        db.delete(pending)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered. Please log in.",
        )

    user = _open_account_from_pending(db, pending)
    db.delete(pending)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.email)
    return TokenResponse(access_token=token, user=user_to_out(user, db))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        token = create_access_token(user.email)
        return TokenResponse(access_token=token, user=user_to_out(user, db))

    pending = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
    if pending is not None and verify_password(payload.password, pending.hashed_password):
        try:
            raw_token = _refresh_pending_verify_token(db, pending)
            send_verification_email(
                to=pending.email,
                full_name=pending.full_name,
                raw_token=raw_token,
                next_path="/membership",
            )
        except Exception:
            # Still tell them to verify even if resend fails; they can register again if needed.
            pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email before signing in. "
                "Check your inbox for a verification link — we just sent another one."
            ),
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")


@router.get("/me", response_model=UserOut)
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    return user_to_out(current_user, db)


@router.patch("/me/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    previous_type = current_user.membership_type
    requested_type = data.get("membership_type")
    if requested_type is not None:
        normalized = normalize_membership_type(requested_type)
        # Paid types must go through Membership checkout, not profile edits.
        if normalized and not is_student_membership(normalized):
            data.pop("membership_type", None)
        else:
            data["membership_type"] = normalized or "student"
    apply_profile_fields(current_user, data)
    if current_user.membership_type != previous_type:
        if is_student_membership(current_user.membership_type):
            current_user.membership_status = "active"
            if current_user.membership_date is None:
                current_user.membership_date = datetime.now(timezone.utc)
            issue_membership_certificate(db, current_user)
        elif membership_is_accessible(db, current_user):
            issue_membership_certificate(db, current_user)
    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user, db)


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangeIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()


@router.get("/me/security-questions", response_model=list[SecurityQuestionOut])
def list_security_questions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SecurityQuestion]:
    return (
        db.query(SecurityQuestion)
        .filter(SecurityQuestion.user_id == current_user.id)
        .order_by(SecurityQuestion.sort_order.asc(), SecurityQuestion.id.asc())
        .all()
    )


@router.put("/me/security-questions", response_model=list[SecurityQuestionOut])
def save_security_questions(
    payload: SecurityQuestionsSaveIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SecurityQuestion]:
    db.query(SecurityQuestion).filter(SecurityQuestion.user_id == current_user.id).delete()
    rows: list[SecurityQuestion] = []
    for index, item in enumerate(payload.questions):
        row = SecurityQuestion(
            user_id=current_user.id,
            question=item.question.strip(),
            answer_hash=hash_password(item.answer.strip().lower()),
            sort_order=index,
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
