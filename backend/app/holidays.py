import datetime as dt
import logging
from collections.abc import Callable

import httpx
from fastapi import Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import HiddenHoliday, Holiday, User

log = logging.getLogger(__name__)

Fetcher = Callable[[int], list[dict]]


class HolidayOut(BaseModel):
    date: dt.date
    name: str
    hidden: bool


def make_brasilapi_fetcher(base_url: str) -> Fetcher:
    def fetch(year: int) -> list[dict]:
        r = httpx.get(f"{base_url}/{year}", timeout=5.0)
        r.raise_for_status()
        return r.json()

    return fetch


def get_holiday_fetcher(request: Request) -> Fetcher:
    return make_brasilapi_fetcher(request.app.state.settings.brasilapi_url)


def ensure_year(db: Session, year: int, fetcher: Fetcher) -> bool:
    if db.scalar(select(func.count()).select_from(Holiday).where(Holiday.year == year)):
        return True
    try:
        rows = [h for h in fetcher(year) if h.get("type") == "national"]
    except Exception:
        log.warning("Falha ao buscar feriados de %s", year, exc_info=True)
        return False
    if not rows:
        log.warning("BrasilAPI não retornou feriados nacionais para %s", year)
        return False
    seen: set[dt.date] = set()
    for h in rows:
        day = dt.date.fromisoformat(h["date"])
        if day in seen:
            continue
        seen.add(day)
        db.add(Holiday(date=day, name=h["name"], year=year))
    try:
        db.commit()
    except IntegrityError:  # outra requisição gravou o mesmo ano ao mesmo tempo
        db.rollback()
    return True


def holidays_between(
    db: Session, user: User, start: dt.date, end: dt.date, fetcher: Fetcher, include_hidden: bool = False
) -> list[HolidayOut]:
    for year in range(start.year, end.year + 1):
        ensure_year(db, year, fetcher)
    hidden = set(db.scalars(select(HiddenHoliday.holiday_date).where(HiddenHoliday.user_id == user.id)))
    rows = db.scalars(
        select(Holiday).where(Holiday.date >= start, Holiday.date <= end).order_by(Holiday.date)
    ).all()
    out = [HolidayOut(date=h.date, name=h.name, hidden=h.date in hidden) for h in rows]
    return out if include_hidden else [h for h in out if not h.hidden]
