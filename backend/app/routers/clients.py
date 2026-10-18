import datetime as dt
import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user, get_owned_client
from app.models import Client, Post, PostStatus, User
from app.schemas import ClientIn, ClientPatch, ClientSummary, NextPost

router = APIRouter(prefix="/api/clients", tags=["clients"])

LOGO_TYPES = {"image/webp", "image/png", "image/jpeg"}
LOGO_MAX_BYTES = 300 * 1024


def _sunday(day: dt.date) -> dt.date:
    return day - dt.timedelta(days=(day.weekday() + 1) % 7)


def _summary(db: Session, client: Client, week_start: dt.date, today: dt.date) -> ClientSummary:
    week_end = week_start + dt.timedelta(days=6)
    rows = db.execute(
        select(Post.status, func.count())
        .where(Post.client_id == client.id, Post.date >= week_start, Post.date <= week_end)
        .group_by(Post.status)
    ).all()
    counts = {s.value: 0 for s in PostStatus}
    for status, n in rows:
        counts[PostStatus(status).value] = n
    nxt = db.scalars(
        select(Post)
        .where(Post.client_id == client.id, Post.date >= today)
        .order_by(Post.date, Post.time.is_(None), Post.time, Post.id)
        .limit(1)
    ).first()
    return ClientSummary(
        id=client.id,
        name=client.name,
        color=client.color,
        has_logo=client.logo is not None,
        logo_version=hashlib.sha1(client.logo).hexdigest()[:8] if client.logo else "",
        archived=client.archived,
        week_total=sum(counts.values()),
        counts=counts,
        next_post=NextPost(date=nxt.date, title=nxt.title) if nxt else None,
    )


@router.get("", response_model=list[ClientSummary])
def list_clients(
    week_start: dt.date | None = None,
    today: dt.date | None = None,
    archived: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    today = today or dt.date.today()
    week_start = week_start or _sunday(today)
    clients = db.scalars(
        select(Client)
        .where(Client.user_id == user.id, Client.archived == archived)
        .order_by(func.lower(Client.name), Client.id)
    ).all()
    return [_summary(db, c, week_start, today) for c in clients]


def _summary_now(db: Session, client: Client) -> ClientSummary:
    today = dt.date.today()
    return _summary(db, client, _sunday(today), today)


@router.post("", response_model=ClientSummary, status_code=201)
def create_client(data: ClientIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = Client(user_id=user.id, name=data.name, color=data.color)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _summary_now(db, client)


@router.patch("/{client_id}", response_model=ClientSummary)
def update_client(
    client_id: int, data: ClientPatch, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    client = get_owned_client(client_id, user, db)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return _summary_now(db, client)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(get_owned_client(client_id, user, db))
    db.commit()
    return Response(status_code=204)


@router.put("/{client_id}/logo", response_model=ClientSummary)
async def upload_logo(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    client = get_owned_client(client_id, user, db)
    if file.content_type not in LOGO_TYPES:
        raise HTTPException(422, "Formato de imagem não suportado")
    data = await file.read(LOGO_MAX_BYTES + 1)
    if len(data) > LOGO_MAX_BYTES:
        raise HTTPException(413, "Imagem muito grande")
    client.logo = data
    client.logo_mime = file.content_type
    db.commit()
    db.refresh(client)
    return _summary_now(db, client)


@router.get("/{client_id}/logo")
def get_logo(client_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = get_owned_client(client_id, user, db)
    if client.logo is None:
        raise HTTPException(404, "Cliente sem logo")
    return Response(
        content=client.logo,
        media_type=client.logo_mime,
        headers={"Cache-Control": "private, max-age=31536000"},
    )


@router.delete("/{client_id}/logo", status_code=204)
def delete_logo(client_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = get_owned_client(client_id, user, db)
    client.logo = None
    client.logo_mime = None
    db.commit()
    return Response(status_code=204)
