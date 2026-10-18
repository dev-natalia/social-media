from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ContentType, Platform, User
from app.security import hash_password

DEFAULT_CONTENT_TYPES = [
    ("Dica", "#3b82f6"),
    ("Tutorial", "#e86a7a"),
    ("Bastidores", "#4fb06d"),
    ("Promoção", "#e0b100"),
    ("Enquete", "#8b5cf6"),
]

DEFAULT_PLATFORMS = [
    ("Instagram", "#e1306c"),
    ("TikTok", "#111111"),
    ("Facebook", "#1877f2"),
    ("LinkedIn", "#0a66c2"),
    ("YouTube", "#ff0000"),
]


def normalize_email(email: str) -> str:
    return email.strip().lower()


def seed_defaults(db: Session, user: User) -> None:
    for i, (name, color) in enumerate(DEFAULT_CONTENT_TYPES):
        db.add(ContentType(user_id=user.id, name=name, color=color, position=i))
    for i, (name, color) in enumerate(DEFAULT_PLATFORMS):
        db.add(Platform(user_id=user.id, name=name, color=color, position=i))


def create_user(db: Session, email: str, password: str, is_admin: bool = False) -> User:
    email = normalize_email(email)
    if db.scalar(select(func.count()).select_from(User).where(User.email == email)):
        raise ValueError("email_taken")
    user = User(email=email, password_hash=hash_password(password), is_admin=is_admin)
    db.add(user)
    db.flush()
    seed_defaults(db, user)
    db.flush()
    return user
