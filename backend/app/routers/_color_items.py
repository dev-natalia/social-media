from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import User
from app.schemas import ColorItemIn, ColorItemOut, ColorItemPatch, ReorderIn


def make_color_item_router(
    model, prefix: str, in_use_count: Callable[[Session, int], int]
) -> APIRouter:
    router = APIRouter(prefix=prefix)

    def _owned(db: Session, user: User, item_id: int):
        item = db.get(model, item_id)
        if item is None or item.user_id != user.id:
            raise HTTPException(404, "Não encontrado")
        return item

    @router.get("", response_model=list[ColorItemOut])
    def list_items(db: Session = Depends(get_db), user: User = Depends(current_user)):
        return db.scalars(
            select(model).where(model.user_id == user.id).order_by(model.position, model.id)
        ).all()

    @router.post("", response_model=ColorItemOut, status_code=201)
    def create_item(data: ColorItemIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
        top = db.scalar(select(func.max(model.position)).where(model.user_id == user.id))
        item = model(user_id=user.id, name=data.name, color=data.color, position=0 if top is None else top + 1)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @router.put("/reorder", status_code=204)
    def reorder(data: ReorderIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
        items = {i.id: i for i in db.scalars(select(model).where(model.user_id == user.id))}
        for pos, item_id in enumerate(data.ids):
            if item_id in items:
                items[item_id].position = pos
        db.commit()
        return Response(status_code=204)

    @router.patch("/{item_id}", response_model=ColorItemOut)
    def update_item(
        item_id: int, data: ColorItemPatch, db: Session = Depends(get_db), user: User = Depends(current_user)
    ):
        item = _owned(db, user, item_id)
        for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
        item = _owned(db, user, item_id)
        count = in_use_count(db, item.id)
        if count:
            raise HTTPException(409, f"Em uso por {count} post(s)")
        db.delete(item)
        db.commit()
        return Response(status_code=204)

    return router
