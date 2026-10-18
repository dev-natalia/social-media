import datetime as dt

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.holidays import Fetcher, HolidayOut, get_holiday_fetcher, holidays_between
from app.models import HiddenHoliday, User

router = APIRouter(prefix="/api/holidays", tags=["holidays"])


@router.get("", response_model=list[HolidayOut])
def year_holidays(
    year: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    fetcher: Fetcher = Depends(get_holiday_fetcher),
):
    return holidays_between(db, user, dt.date(year, 1, 1), dt.date(year, 12, 31), fetcher, include_hidden=True)


@router.post("/{day}/hide", status_code=204)
def hide(day: dt.date, db: Session = Depends(get_db), user: User = Depends(current_user)):
    exists = db.scalar(
        select(HiddenHoliday).where(HiddenHoliday.user_id == user.id, HiddenHoliday.holiday_date == day)
    )
    if exists is None:
        db.add(HiddenHoliday(user_id=user.id, holiday_date=day))
        db.commit()
    return Response(status_code=204)


@router.delete("/{day}/hide", status_code=204)
def unhide(day: dt.date, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.execute(delete(HiddenHoliday).where(HiddenHoliday.user_id == user.id, HiddenHoliday.holiday_date == day))
    db.commit()
    return Response(status_code=204)
