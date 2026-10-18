from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Platform, post_platforms
from app.routers._color_items import make_color_item_router


def _in_use(db: Session, item_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(post_platforms).where(post_platforms.c.platform_id == item_id)
    )


router = make_color_item_router(Platform, "/api/platforms", _in_use)
