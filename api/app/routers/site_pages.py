"""Public and admin landing pages."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SitePage, User
from app.schemas.site_pages import HomeLandingIn, HomeLandingOut, SiteNavOut, SitePageIn, SitePageOut
from app.security.auth import require_admin
from app.services.site_pages import (
    delete_page,
    home_for_admin,
    list_pages,
    nav_items,
    page_out,
    published_page,
    read_home,
    save_page,
    write_home,
)

router = APIRouter(tags=["site-pages"])


@router.get("/site-pages/nav", response_model=SiteNavOut)
def public_site_nav(db: Session = Depends(get_db)) -> SiteNavOut:
    return SiteNavOut(items=nav_items(db))


@router.get("/site-pages/by-path", response_model=SitePageOut)
def public_site_page(
    path: str = Query(min_length=1, max_length=255),
    db: Session = Depends(get_db),
) -> SitePageOut:
    return published_page(db, path)


@router.get("/site-pages/home", response_model=HomeLandingOut)
def public_home_landing(db: Session = Depends(get_db)) -> HomeLandingOut:
    return read_home(db) or HomeLandingOut()


@router.get("/admin/site-pages", response_model=list[SitePageOut])
def admin_list_site_pages(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SitePageOut]:
    return list_pages(db)


@router.post("/admin/site-pages", response_model=SitePageOut, status_code=status.HTTP_201_CREATED)
def admin_create_site_page(
    payload: SitePageIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SitePageOut:
    return page_out(save_page(db, payload))


@router.get("/admin/site-pages/home", response_model=HomeLandingOut)
def admin_get_home_landing(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> HomeLandingOut:
    return home_for_admin(db)


@router.put("/admin/site-pages/home", response_model=HomeLandingOut)
def admin_save_home_landing(
    payload: HomeLandingIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> HomeLandingOut:
    return write_home(db, payload)


@router.put("/admin/site-pages/{page_id}", response_model=SitePageOut)
def admin_update_site_page(
    page_id: int,
    payload: SitePageIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SitePageOut:
    page = db.query(SitePage).filter(SitePage.id == page_id).first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page_out(save_page(db, payload, page))


@router.delete("/admin/site-pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_site_page(
    page_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    page = db.query(SitePage).filter(SitePage.id == page_id).first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    delete_page(db, page)
