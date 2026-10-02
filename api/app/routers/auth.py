from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db import get_db
from app.security.auth import create_access_token, get_current_user, hash_password, verify_password
from app.security.limiter import limiter
from app.models import MembershipApplication, SecurityQuestion, User
from app.schemas.auth import (
    PasswordChangeIn,
    ProfileUpdate,
    SecurityQuestionOut,
    SecurityQuestionsSaveIn,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.commerce import apply_profile_fields, normalize_membership_type, profile_is_complete
from app.services.membership import (
    activate_membership,
    is_student_membership,
    issue_membership_certificate,
    membership_is_accessible,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def user_to_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.profile_completed = profile_is_complete(user)
    return out


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    now = datetime.now(timezone.utc)
    requested_type = (
        normalize_membership_type(payload.membership_type) if payload.membership_type else "student"
    )
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        country=payload.country.strip(),
        city=payload.city.strip(),
        given_name=(payload.given_name or "").strip() or None,
        family_name=(payload.family_name or "").strip() or None,
        address=(payload.address or "").strip() or None,
        organization=(payload.organization or "").strip() or None,
        job_title=(payload.job_title or "").strip() or None,
        hashed_password=hash_password(payload.password),
        role="student",
        membership_type="student",
        membership_status="active",
        membership_date=now,
    )
    db.add(user)
    db.flush()
    issue_membership_certificate(db, user)
    if requested_type != "student":
        activate_membership(db, user, requested_type)
    if payload.details and payload.details.strip():
        db.add(
            MembershipApplication(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone or "",
                country=user.country or "",
                city=user.city or "",
                address=user.address,
                organization=user.organization,
                job_title=user.job_title,
                details=payload.details.strip()[:8000],
                membership_type=user.membership_type or "student",
                membership_status="active",
                membership_date=now,
            )
        )
    db.refresh(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.email)
    return TokenResponse(access_token=token, user=user_to_out(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.email)
    return TokenResponse(access_token=token, user=user_to_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return user_to_out(current_user)


@router.patch("/me/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    previous_type = current_user.membership_type
    apply_profile_fields(current_user, payload.model_dump(exclude_unset=True))
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
    return user_to_out(current_user)


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
        .order_by(SecurityQuestion.sort_order.asc())
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
    return (
        db.query(SecurityQuestion)
        .filter(SecurityQuestion.user_id == current_user.id)
        .order_by(SecurityQuestion.sort_order.asc())
        .all()
    )
