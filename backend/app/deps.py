from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    uid = request.session.get("uid")
    user = db.get(User, uid) if uid else None
    if user is None or not user.is_active:
        request.session.clear()
        raise HTTPException(401, "Não autenticado")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Apenas administradores")
    return user


def get_owned_client(client_id: int, user: User, db: Session):
    from app.models import Client

    client = db.get(Client, client_id)
    if client is None or client.user_id != user.id:
        raise HTTPException(404, "Cliente não encontrado")
    return client
