import datetime as dt

from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

from app.models import PostStatus

HexColor = Annotated[
    str, Field(pattern=r"^#[0-9a-fA-F]{6}$"), AfterValidator(lambda v: v.lower())
]


class ColorItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: HexColor


class ColorItemPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    color: HexColor | None = None


class ColorItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    color: str
    position: int


class ReorderIn(BaseModel):
    ids: list[int]


class ClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: HexColor


class ClientPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    color: HexColor | None = None
    archived: bool | None = None


class NextPost(BaseModel):
    date: dt.date
    title: str


class ClientSummary(BaseModel):
    id: int
    name: str
    color: str
    has_logo: bool
    logo_version: str
    archived: bool
    week_total: int
    counts: dict[str, int]
    next_post: NextPost | None


def _check_drive_url(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    v = v.strip()
    if not (v.startswith("http://") or v.startswith("https://")):
        raise ValueError("O link precisa começar com http:// ou https://")
    return v


def _check_checklist(v: dict | None) -> dict | None:
    from app.models import CHECKLIST_KEYS

    if v is None:
        return None
    unknown = set(v) - set(CHECKLIST_KEYS)
    if unknown:
        raise ValueError(f"Itens de checklist desconhecidos: {', '.join(sorted(unknown))}")
    return v


DriveUrl = Annotated[str | None, AfterValidator(_check_drive_url)]
ChecklistIn = Annotated[dict[str, bool] | None, AfterValidator(_check_checklist)]


class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    date: dt.date
    time: dt.time | None = None
    content_type_id: int
    platform_ids: list[int] = []
    format: str | None = Field(default=None, max_length=30)
    status: PostStatus = PostStatus.a_fazer
    description: str = ""
    drive_url: DriveUrl = None
    checklist: ChecklistIn = None


class PostPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=80)
    date: dt.date | None = None
    time: dt.time | None = None
    content_type_id: int | None = None
    platform_ids: list[int] | None = None
    format: str | None = Field(default=None, max_length=30)
    status: PostStatus | None = None
    description: str | None = None
    drive_url: DriveUrl = None
    checklist: ChecklistIn = None


class PostOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    client_id: int
    title: str
    date: dt.date
    time: dt.time | None
    content_type: ColorItemOut
    platforms: list[ColorItemOut]
    format: str | None
    status: PostStatus
    description: str
    drive_url: str | None
    checklist: dict[str, bool]
    updated_at: dt.datetime


class ImportantDateIn(BaseModel):
    date: dt.date
    name: str = Field(min_length=1, max_length=60)
    client_id: int | None = None
    recurring_yearly: bool = False


class ImportantDatePatch(BaseModel):
    date: dt.date | None = None
    name: str | None = Field(default=None, min_length=1, max_length=60)
    recurring_yearly: bool | None = None


class ImportantDateOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    date: dt.date
    name: str
    client_id: int | None
    recurring_yearly: bool
