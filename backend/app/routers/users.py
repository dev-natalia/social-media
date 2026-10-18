import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import admin_user
from app.models import User
from app.security import hash_password
from app.seed import create_user

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)


class UserPatch(BaseModel):
    password: str | None = Field(default=None, min_length=8)
    is_active: bool | None = None


class UserAdminOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    is_admin: bool
    is_active: bool
    created_at: dt.datetime


@router.get("", response_model=list[UserAdminOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(admin_user)):
    return db.scalars(select(User).order_by(User.email)).all()


@router.post("", response_model=UserAdminOut, status_code=201)
def add_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(admin_user)):
    try:
        user = create_user(db, data.email, data.password)
    except ValueError:
        raise HTTPException(409, "E-mail já cadastrado")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserAdminOut)
def patch_user(
    user_id: int, data: UserPatch, db: Session = Depends(get_db), admin: User = Depends(admin_user)
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Usuário não encontrado")
    if data.is_active is False and user.id == admin.id:
        raise HTTPException(400, "Você não pode desativar a própria conta")
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user
