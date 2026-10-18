import calendar
import datetime as dt

from pydantic import BaseModel

from app.models import ImportantDate


class Occurrence(BaseModel):
    id: int
    date: dt.date
    name: str
    client_id: int | None
    recurring_yearly: bool


def _in_year(day: dt.date, year: int) -> dt.date:
    if day.month == 2 and day.day == 29 and not calendar.isleap(year):
        return dt.date(year, 2, 28)
    return day.replace(year=year)


def expand_occurrences(items: list[ImportantDate], start: dt.date, end: dt.date) -> list[Occurrence]:
    out: list[Occurrence] = []
    for item in items:
        if item.recurring_yearly:
            days = [_in_year(item.date, y) for y in range(start.year, end.year + 1)]
            days = [d for d in days if d >= item.date]
        else:
            days = [item.date]
        for d in days:
            if start <= d <= end:
                out.append(
                    Occurrence(
                        id=item.id,
                        date=d,
                        name=item.name,
                        client_id=item.client_id,
                        recurring_yearly=item.recurring_yearly,
                    )
                )
    out.sort(key=lambda o: (o.date, o.name))
    return out
