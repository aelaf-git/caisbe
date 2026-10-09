from datetime import datetime, timedelta, timezone
from pathlib import Path
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import PasswordResetToken, PendingRegistration, SecurityQuestion, User
from app.schemas.auth import (
    AppearanceUpdate,
    ForgotPasswordIn,
    ForgotPasswordOut,
    PasswordChangeIn,
    ProfileUpdate,
    RegisterPendingOut,
    ResetPasswordIn,
    ResetPasswordOut,
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
    LOGIN_LOCKOUT_MINUTES,
    LOGIN_MAX_FAILURES,
    PASSWORD_RESET_HOURS,
    create_access_token,
    get_current_user,
    hash_email_verify_token,
    hash_password,
    hash_password_reset_token,
    new_email_verify_token,
    new_password_reset_token,
    verify_password,
    verify_password_or_dummy,
)
from app.security.client_ip import get_client_ip
from app.services.access_control import ACCOUNT_SUSPENDED_DETAIL, record_login_event
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
from app.services.password_reset_email import send_password_reset_email
from app.services.verify_email import send_verification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_MEMBERSHIP_DOC_SUFFIXES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"}
FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, we sent instructions to continue."
)
_INVALID_CREDENTIALS = "Invalid email or password"


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    head = local[:1] if local else "*"
    return f"{head}***@{domain}"


def _log_login_failure(email: str, client_ip: str, reason: str) -> None:
    logger.warning(
        "login_failed email=%s ip=%s reason=%s",
        _mask_email(email),
        client_ip,
        reason,
    )


def _record_failed_login(db: Session, user: User) -> None:
    user.failed_login_count = int(user.failed_login_count or 0) + 1
    if user.failed_login_count >= LOGIN_MAX_FAILURES:
        user.login_locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
        user.failed_login_count = 0
    db.commit()


def _user_is_locked(user: User, now: datetime) -> bool:
    until = user.login_locked_until
    if until is None:
        return False
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    return until > now


def user_to_out(user: User, db: Session | None = None) -> UserOut:
    out = UserOut.model_validate(user)
    out.profile_completed = profile_is_complete(user)
    out.email_verified = user.email_verified_at is not None
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
        email_verified_at=now,
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
@limiter.limit("5/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    client_ip = get_client_ip(request)
    now = datetime.now(timezone.utc)

    user = db.query(User).filter(User.email == email).first()
    pending = (
        None
        if user is not None
        else db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
    )

    hash_to_check: str | None = None
    if user is not None:
        hash_to_check = user.hashed_password
    elif pending is not None:
        hash_to_check = pending.hashed_password

    password_ok = verify_password_or_dummy(payload.password, hash_to_check)
    locked = user is not None and _user_is_locked(user, now)

    if locked:
        _log_login_failure(email, client_ip, "locked")
        record_login_event(
            db,
            email=email,
            success=False,
            reason="locked",
            ip_address=client_ip,
            user_id=user.id if user is not None else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)

    if user is not None:
        if not password_ok:
            _record_failed_login(db, user)
            _log_login_failure(email, client_ip, "bad_credentials")
            record_login_event(
                db,
                email=email,
                success=False,
                reason="bad_credentials",
                ip_address=client_ip,
                user_id=user.id,
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)
        if user.email_verified_at is None:
            _log_login_failure(email, client_ip, "unverified")
            record_login_event(
                db,
                email=email,
                success=False,
                reason="unverified",
                ip_address=client_ip,
                user_id=user.id,
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)
        if user.suspended_at is not None:
            _log_login_failure(email, client_ip, "suspended")
            record_login_event(
                db,
                email=email,
                success=False,
                reason="suspended",
                ip_address=client_ip,
                user_id=user.id,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ACCOUNT_SUSPENDED_DETAIL)
        user.failed_login_count = 0
        user.login_locked_until = None
        record_login_event(
            db,
            email=email,
            success=True,
            reason="success",
            ip_address=client_ip,
            user_id=user.id,
        )
        token = create_access_token(user.email)
        return TokenResponse(access_token=token, user=user_to_out(user, db))

    if pending is not None and password_ok:
        try:
            raw_token = _refresh_pending_verify_token(db, pending)
            send_verification_email(
                to=pending.email,
                full_name=pending.full_name,
                raw_token=raw_token,
                next_path="/membership",
            )
        except Exception:
            pass
        _log_login_failure(email, client_ip, "unverified_pending")
        record_login_event(
            db,
            email=email,
            success=False,
            reason="unverified_pending",
            ip_address=client_ip,
            user_id=None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email before signing in. "
                "Check your inbox for a verification link — we just sent another one."
            ),
        )

    _log_login_failure(email, client_ip, "bad_credentials")
    record_login_event(
        db,
        email=email,
        success=False,
        reason="bad_credentials",
        ip_address=client_ip,
        user_id=user.id if user is not None else None,
    )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)


@router.post("/forgot-password", response_model=ForgotPasswordOut)
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordIn,
    db: Session = Depends(get_db),
) -> ForgotPasswordOut:
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is not None and user.email_verified_at is not None:
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
        raw_token, token_hash = new_password_reset_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_HOURS),
            )
        )
        db.commit()
        try:
            send_password_reset_email(
                to=user.email,
                full_name=user.full_name,
                raw_token=raw_token,
            )
        except Exception:
            # Keep generic response; token remains usable if email eventually delivers via logs in dev.
            pass
        return ForgotPasswordOut(message=FORGOT_PASSWORD_MESSAGE)

    pending = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
    if pending is not None:
        try:
            raw_token = _refresh_pending_verify_token(db, pending)
            send_verification_email(
                to=pending.email,
                full_name=pending.full_name,
                raw_token=raw_token,
                next_path="/membership",
            )
        except Exception:
            pass

    return ForgotPasswordOut(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=ResetPasswordOut)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordIn,
    db: Session = Depends(get_db),
) -> ResetPasswordOut:
    token_hash = hash_password_reset_token(payload.token)
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == row.user_id).delete()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )

    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None or user.email_verified_at is None:
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == row.user_id).delete()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )

    user.hashed_password = hash_password(payload.new_password)
    user.failed_login_count = 0
    user.login_locked_until = None
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    db.commit()
    return ResetPasswordOut(message="Your password has been updated. You can sign in now.")


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


@router.patch("/me/appearance", response_model=UserOut)
def update_appearance(
    payload: AppearanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    """Persist portal theme/fonts on this student only (never global settings)."""
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(current_user, key, value)
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
