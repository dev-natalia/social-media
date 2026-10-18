import datetime as dt

from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

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
