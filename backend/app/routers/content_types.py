from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ContentType, Post
from app.routers._color_items import make_color_item_router


def _in_use(db: Session, item_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Post).where(Post.content_type_id == item_id))


router = make_color_item_router(ContentType, "/api/content-types", _in_use)
