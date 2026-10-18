import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.dates import Occurrence, expand_occurrences
from app.db import get_db
from app.deps import current_user, get_owned_client
from app.models import Client, ImportantDate, User
from app.schemas import ImportantDateIn, ImportantDateOut, ImportantDatePatch

router = APIRouter(prefix="/api/important-dates", tags=["important-dates"])


def occurrences_for_client(
    db: Session, user: User, client: Client, start: dt.date, end: dt.date
) -> list[Occurrence]:
    items = db.scalars(
        select(ImportantDate).where(
            ImportantDate.user_id == user.id,
            or_(ImportantDate.client_id.is_(None), ImportantDate.client_id == client.id),
        )
    ).all()
    return expand_occurrences(list(items), start, end)


def _owned(db: Session, user: User, date_id: int) -> ImportantDate:
    item = db.get(ImportantDate, date_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(404, "Data não encontrada")
    return item


@router.get("", response_model=list[ImportantDateOut])
def list_dates(client_id: str = "general", db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = select(ImportantDate).where(ImportantDate.user_id == user.id)
    if client_id == "general":
        q = q.where(ImportantDate.client_id.is_(None))
    else:
        try:
            cid = int(client_id)
        except ValueError:
            raise HTTPException(422, "client_id inválido")
        q = q.where(ImportantDate.client_id == get_owned_client(cid, user, db).id)
    return db.scalars(q.order_by(ImportantDate.date, ImportantDate.name)).all()


@router.post("", response_model=ImportantDateOut, status_code=201)
def create_date(data: ImportantDateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if data.client_id is not None:
        get_owned_client(data.client_id, user, db)
    item = ImportantDate(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{date_id}", response_model=ImportantDateOut)
def update_date(
    date_id: int, data: ImportantDatePatch, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    item = _owned(db, user, date_id)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{date_id}", status_code=204)
def delete_date(date_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(_owned(db, user, date_id))
    db.commit()
    return Response(status_code=204)
