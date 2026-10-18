import enum
import datetime as dt

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Table,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PostStatus(str, enum.Enum):
    a_fazer = "a_fazer"
    editando = "editando"
    agendado = "agendado"
    postado = "postado"


CHECKLIST_KEYS = ("roteiro", "captacao", "edicao", "aprovacao", "agendamento")


def empty_checklist() -> dict[str, bool]:
    return {k: False for k in CHECKLIST_KEYS}


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    color: Mapped[str] = mapped_column(String(7))
    logo: Mapped[bytes | None] = mapped_column(LargeBinary, default=None)
    logo_mime: Mapped[str | None] = mapped_column(String(30), default=None)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts: Mapped[list["Post"]] = relationship(
        back_populates="client", cascade="all, delete-orphan", passive_deletes=True
    )


class ContentType(Base):
    __tablename__ = "content_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    color: Mapped[str] = mapped_column(String(7))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    color: Mapped[str] = mapped_column(String(7))
    position: Mapped[int] = mapped_column(Integer, default=0)


post_platforms = Table(
    "post_platforms",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("platform_id", ForeignKey("platforms.id", ondelete="RESTRICT"), primary_key=True),
)


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (Index("ix_posts_client_date", "client_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(80))
    date: Mapped[dt.date] = mapped_column(Date)
    time: Mapped[dt.time | None] = mapped_column(Time, default=None)
    content_type_id: Mapped[int] = mapped_column(ForeignKey("content_types.id", ondelete="RESTRICT"))
    format: Mapped[str | None] = mapped_column(String(30), default=None)
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, native_enum=False, length=20), default=PostStatus.a_fazer
    )
    description: Mapped[str] = mapped_column(Text, default="")
    drive_url: Mapped[str | None] = mapped_column(String(1000), default=None)
    checklist: Mapped[dict] = mapped_column(JSON, default=empty_checklist)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client: Mapped[Client] = relationship(back_populates="posts")
    content_type: Mapped[ContentType] = relationship()
    platforms: Mapped[list[Platform]] = relationship(secondary=post_platforms, order_by="Platform.position")


class ImportantDate(Base):
    __tablename__ = "important_dates"
    __table_args__ = (Index("ix_important_dates_user_date", "user_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), default=None
    )
    date: Mapped[dt.date] = mapped_column(Date)
    name: Mapped[str] = mapped_column(String(60))
    recurring_yearly: Mapped[bool] = mapped_column(Boolean, default=False)


class Holiday(Base):
    __tablename__ = "holidays"

    date: Mapped[dt.date] = mapped_column(Date, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    year: Mapped[int] = mapped_column(Integer, index=True)


class HiddenHoliday(Base):
    __tablename__ = "hidden_holidays"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    holiday_date: Mapped[dt.date] = mapped_column(Date, primary_key=True)
