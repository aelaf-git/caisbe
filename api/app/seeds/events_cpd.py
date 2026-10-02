"""Seed industry FM events if empty."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import IndustryEvent


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, 12, 0, tzinfo=timezone.utc)


SEED_EVENTS: list[dict] = [
    {
        "title": "IFMA World Workplace",
        "summary": "IFMA’s flagship facility management conference covering workplace strategy, operations, technology, and sustainability.",
        "location": "Varies annually (North America)",
        "region": "North America",
        "event_type": "conferences",
        "starts_on": _dt(2026, 10, 14),
        "ends_on": _dt(2026, 10, 16),
        "source_name": "IFMA",
        "source_url": "https://www.ifma.org/events/world-workplace/",
        "cpd_hours": 12,
        "featured": True,
        "sort_order": 10,
    },
    {
        "title": "The Facilities Show",
        "summary": "Major UK exhibition and conference for facilities management, workplace, and building services professionals.",
        "location": "ExCeL London, United Kingdom",
        "region": "Europe",
        "event_type": "calendar",
        "starts_on": _dt(2026, 11, 17),
        "ends_on": _dt(2026, 11, 19),
        "source_name": "Facilities Show",
        "source_url": "https://www.facilitiesshow.com/",
        "cpd_hours": 8,
        "featured": True,
        "sort_order": 20,
    },
    {
        "title": "Workplace Evolution Africa",
        "summary": "Pan-African workplace and facilities forum focusing on innovation, people experience, and built-environment performance.",
        "location": "Johannesburg / rotating African host cities",
        "region": "Africa",
        "event_type": "expo",
        "starts_on": _dt(2026, 5, 20),
        "ends_on": _dt(2026, 5, 21),
        "source_name": "Industry calendar",
        "source_url": "https://www.eventseye.com/",
        "cpd_hours": 6,
        "featured": True,
        "sort_order": 30,
    },
    {
        "title": "Greenbuild International Conference & Expo",
        "summary": "Leading green building conference covering sustainable design, energy performance, and healthy buildings.",
        "location": "United States (rotating)",
        "region": "North America",
        "event_type": "conferences",
        "starts_on": _dt(2026, 11, 4),
        "ends_on": _dt(2026, 11, 6),
        "source_name": "USGBC Greenbuild",
        "source_url": "https://greenbuildexpo.com/",
        "cpd_hours": 10,
        "featured": False,
        "sort_order": 40,
    },
    {
        "title": "ISSA Show North America",
        "summary": "Cleaning, hygiene, and facility services exhibition relevant to soft services and FM operations teams.",
        "location": "Las Vegas / rotating US venues",
        "region": "North America",
        "event_type": "calendar",
        "starts_on": _dt(2026, 11, 10),
        "ends_on": _dt(2026, 11, 12),
        "source_name": "ISSA",
        "source_url": "https://www.issashows.com/",
        "cpd_hours": 6,
        "featured": False,
        "sort_order": 50,
    },
    {
        "title": "Africa–Canada Built Environment Expo & Forum",
        "summary": "CAISBE flagship platform for collaboration, investment dialogue, and sustainable built-environment practice between Africa and Canada.",
        "location": "Africa / Canada (announced annually)",
        "region": "Africa & Canada",
        "event_type": "expo",
        "starts_on": _dt(2026, 9, 15),
        "ends_on": _dt(2026, 9, 17),
        "source_name": "CAISBE",
        "source_url": "/events/expo",
        "cpd_hours": 14,
        "featured": True,
        "sort_order": 5,
    },
    {
        "title": "IWFM Impact Awards & Conference",
        "summary": "UK Institute of Workplace and Facilities Management conference and awards celebrating workplace and FM excellence.",
        "location": "United Kingdom",
        "region": "Europe",
        "event_type": "conferences",
        "starts_on": _dt(2026, 6, 11),
        "ends_on": _dt(2026, 6, 12),
        "source_name": "IWFM",
        "source_url": "https://www.iwfm.org.uk/",
        "cpd_hours": 7,
        "featured": False,
        "sort_order": 60,
    },
    {
        "title": "Smart Buildings & PropTech Africa Summit",
        "summary": "Industry summit on smart buildings, IoT operations, and digital property technologies across African markets.",
        "location": "Nairobi / rotating",
        "region": "Africa",
        "event_type": "conferences",
        "starts_on": _dt(2026, 4, 8),
        "ends_on": _dt(2026, 4, 9),
        "source_name": "Industry reports / EventsEye",
        "source_url": "https://www.eventseye.com/",
        "cpd_hours": 5,
        "featured": False,
        "sort_order": 70,
    },
]


def seed_industry_events(db: Session) -> None:
    if db.query(IndustryEvent).count() == 0:
        for item in SEED_EVENTS:
            db.add(
                IndustryEvent(
                    title=item["title"],
                    summary=item["summary"],
                    location=item["location"],
                    region=item["region"],
                    event_type=item["event_type"],
                    starts_on=item["starts_on"],
                    ends_on=item["ends_on"],
                    source_name=item["source_name"],
                    source_url=item["source_url"],
                    cpd_hours=item["cpd_hours"],
                    published=True,
                    featured=item["featured"],
                    sort_order=item["sort_order"],
                )
            )

    db.commit()


# Back-compat alias for older imports
seed_industry_events_and_cpd = seed_industry_events
