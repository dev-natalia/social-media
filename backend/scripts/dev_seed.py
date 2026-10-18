"""Cria dados de desenvolvimento local (NUNCA rode em produção).

Uso: python scripts/dev_seed.py   (dentro de backend/, com DATABASE_URL de um banco local)
"""

import datetime as dt
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

sys.path.insert(0, ".")

from app.config import get_settings  # noqa: E402
from app.db import make_engine  # noqa: E402
from app.models import Client, ContentType, Platform, Post, PostStatus, User  # noqa: E402
from app.seed import create_user  # noqa: E402

DEV_EMAIL = "dev@planner.test"
DEV_PASSWORD = "planner-dev-123"


def main() -> None:
    url = get_settings().database_url
    if "localhost" not in url and "127.0.0.1" not in url:
        sys.exit("dev_seed só roda contra um banco local.")
    with Session(make_engine(url)) as db:
        user = db.scalar(select(User).where(User.email == DEV_EMAIL))
        if user is None:
            user = create_user(db, DEV_EMAIL, DEV_PASSWORD, is_admin=True)
        if not db.scalar(select(Client).where(Client.user_id == user.id)):
            types = db.scalars(select(ContentType).where(ContentType.user_id == user.id).order_by(ContentType.position)).all()
            plats = db.scalars(select(Platform).where(Platform.user_id == user.id).order_by(Platform.position)).all()
            padaria = Client(user_id=user.id, name="Padaria Trigo", color="#c9b6f2")
            studio = Client(user_id=user.id, name="Studio Verde", color="#9fd8c0")
            db.add_all([padaria, studio, Client(user_id=user.id, name="Dra. Luana", color="#f6c28b")])
            db.flush()
            today = dt.date.today()
            sunday = today - dt.timedelta(days=(today.weekday() + 1) % 7)
            samples = [
                (2, "Pão de fermentação natural", 1, PostStatus.agendado, "Reels", dt.time(10)),
                (3, "5 anos de Trigo!", 3, PostStatus.editando, "Carrossel", dt.time(12)),
                (4, "Equipe da madrugada", 2, PostStatus.a_fazer, "Story", None),
                (5, "Como guardar pão", 0, PostStatus.a_fazer, "Carrossel", dt.time(18)),
                (6, "Qual seu favorito?", 4, PostStatus.postado, "Story", None),
            ]
            for offset, title, t, status, fmt, hour in samples:
                post = Post(
                    client_id=padaria.id,
                    title=title,
                    date=sunday + dt.timedelta(days=offset),
                    time=hour,
                    content_type_id=types[t].id,
                    status=status,
                    format=fmt,
                )
                post.platforms = [plats[0]]
                db.add(post)
            db.add(
                Post(client_id=studio.id, title="Antes e depois", date=sunday + dt.timedelta(days=3), content_type_id=types[0].id)
            )
        db.commit()
    print(f"Pronto. Login: {DEV_EMAIL}")


if __name__ == "__main__":
    main()
