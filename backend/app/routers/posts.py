import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import current_user, get_owned_client
from app.models import Client, ContentType, Platform, Post, PostStatus, User, empty_checklist
from app.schemas import PostIn, PostOut, PostPatch

router = APIRouter(prefix="/api", tags=["posts"])


def list_posts(
    db: Session, client: Client, start: dt.date, end: dt.date, statuses: list[PostStatus] | None = None
) -> list[Post]:
    q = (
        select(Post)
        .options(selectinload(Post.content_type), selectinload(Post.platforms))
        .where(Post.client_id == client.id, Post.date >= start, Post.date <= end)
        .order_by(Post.date, Post.time.is_(None), Post.time, Post.id)
    )
    if statuses:
        q = q.where(Post.status.in_(statuses))
    return list(db.scalars(q).all())


def _owned_post(db: Session, user: User, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if post is None or post.client.user_id != user.id:
        raise HTTPException(404, "Post não encontrado")
    return post


def _resolve_refs(db: Session, user: User, content_type_id: int | None, platform_ids: list[int] | None):
    ctype = None
    if content_type_id is not None:
        ctype = db.get(ContentType, content_type_id)
        if ctype is None or ctype.user_id != user.id:
            raise HTTPException(422, "Tipo ou rede inválidos")
    plats = None
    if platform_ids is not None:
        ids = set(platform_ids)
        plats = list(db.scalars(select(Platform).where(Platform.id.in_(ids), Platform.user_id == user.id)))
        if len(plats) != len(ids):
            raise HTTPException(422, "Tipo ou rede inválidos")
    return ctype, plats


@router.get("/clients/{client_id}/posts", response_model=list[PostOut])
def get_posts(
    client_id: int,
    start: dt.date,
    end: dt.date,
    status: list[PostStatus] = Query(default=[]),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    client = get_owned_client(client_id, user, db)
    return list_posts(db, client, start, end, status)


@router.post("/clients/{client_id}/posts", response_model=PostOut, status_code=201)
def create_post(client_id: int, data: PostIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = get_owned_client(client_id, user, db)
    _, plats = _resolve_refs(db, user, data.content_type_id, data.platform_ids)
    post = Post(
        client_id=client.id,
        title=data.title,
        date=data.date,
        time=data.time,
        content_type_id=data.content_type_id,
        format=data.format or None,
        status=data.status,
        description=data.description,
        drive_url=data.drive_url,
        checklist=empty_checklist() | (data.checklist or {}),
    )
    post.platforms = plats
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(post_id: int, data: PostPatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    post = _owned_post(db, user, post_id)
    sent = data.model_fields_set
    _, plats = _resolve_refs(db, user, data.content_type_id, data.platform_ids)
    nullable = {"time", "format", "drive_url"}
    for field in ("title", "date", "time", "content_type_id", "format", "status", "description", "drive_url"):
        if field not in sent:
            continue
        value = getattr(data, field)
        if value is None and field not in nullable:
            continue
        if field == "format":
            value = value or None
        setattr(post, field, value)
    if plats is not None:
        post.platforms = plats
    if data.checklist is not None:
        post.checklist = empty_checklist() | post.checklist | data.checklist
    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(_owned_post(db, user, post_id))
    db.commit()
    return Response(status_code=204)


@router.post("/posts/{post_id}/duplicate", response_model=PostOut, status_code=201)
def duplicate_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    src = _owned_post(db, user, post_id)
    copy = Post(
        client_id=src.client_id,
        title=f"{src.title} (cópia)"[:80],
        date=src.date,
        time=src.time,
        content_type_id=src.content_type_id,
        format=src.format,
        status=PostStatus.a_fazer,
        description=src.description,
        drive_url=src.drive_url,
        checklist=empty_checklist(),
    )
    copy.platforms = list(src.platforms)
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy
