from pydantic import BaseModel, Field


class SiteSection(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = ""
    items: list[str] = Field(default_factory=list, max_length=30)


class SitePageIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    menu_label: str = Field(default="", max_length=120)
    slug: str = Field(min_length=1, max_length=80)
    parent_id: int | None = None
    description: str = ""
    lead: str = ""
    sections: list[SiteSection] = Field(default_factory=list, max_length=20)
    cta_label: str | None = Field(default=None, max_length=120)
    cta_href: str | None = Field(default=None, max_length=500)
    sort_order: int = 0
    show_in_menu: bool = True
    status: str = "draft"


class SitePageOut(BaseModel):
    id: int
    parent_id: int | None = None
    title: str
    menu_label: str
    slug: str
    path: str
    description: str
    lead: str
    sections: list[SiteSection] = Field(default_factory=list)
    cta_label: str | None = None
    cta_href: str | None = None
    sort_order: int
    show_in_menu: bool
    status: str

    model_config = {"from_attributes": True}


class SiteNavItem(BaseModel):
    menu_label: str
    path: str
    parent_path: str | None = None
    sort_order: int = 0


class SiteNavOut(BaseModel):
    items: list[SiteNavItem] = Field(default_factory=list)


class HomeStat(BaseModel):
    value: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=160)


class HomeLandingIn(BaseModel):
    tagline: str = Field(min_length=1, max_length=200)
    hero_intro: str = Field(min_length=1, max_length=2000)
    stats: list[HomeStat] = Field(min_length=1, max_length=8)


class HomeLandingOut(BaseModel):
    tagline: str | None = None
    hero_intro: str | None = None
    stats: list[HomeStat] = Field(default_factory=list)
