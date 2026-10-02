from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.security.auth import create_access_token, get_current_user, hash_password, verify_password
from app.security.limiter import limiter
from app.models import SecurityQuestion, User
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
from app.services.commerce import apply_profile_fields, profile_is_complete

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

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        country=payload.country.strip(),
        city=payload.city.strip(),
        hashed_password=hash_password(payload.password),
        role="student",
        membership_status="pending",
    )
    db.add(user)
    db.flush()
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
    apply_profile_fields(current_user, payload.model_dump(exclude_unset=True))
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
