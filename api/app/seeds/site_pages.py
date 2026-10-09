"""Copy the current About and Resources topic pages into the editor once."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import SitePage
from app.services.site_pages import _assign_paths, _pages

Section = dict


def _sections(*parts: tuple[str, str, list[str]]) -> list[Section]:
    return [{"title": title, "body": body, "items": items} for title, body, items in parts]


ABOUT_PAGES = [
    {
        "slug": "board-of-directors",
        "title": "Board of Directors",
        "description": "Meet the leadership guiding CAISBE strategy, governance, and professional standards.",
        "lead": "The Board guides CAISBE strategy, stewardship, and professional standards across Africa–Canada collaboration.",
        "sections": _sections(
            (
                "Board focus",
                "",
                [
                    "Strategic direction and institutional integrity",
                    "Oversight of programs, partnerships, and finances",
                    "Advancing professional excellence in the built environment",
                ],
            ),
            (
                "Leadership areas",
                "",
                [
                    "Chair and executive officers",
                    "Program and membership stewardship",
                    "Regional and partnership liaison roles",
                ],
            ),
            (
                "Connect with leadership",
                "For board correspondence, nominations, or governance questions, contact the institute office.",
                [],
            ),
        ),
        "cta_label": "Contact the Board Office",
        "cta_href": "/contact",
    },
    {
        "slug": "staff",
        "title": "Staff",
        "description": "Get to know the CAISBE team supporting members, programs, and partnerships.",
        "lead": "CAISBE staff support members, programs, events, and day-to-day institute operations.",
        "sections": _sections(
            (
                "How the team supports you",
                "",
                [
                    "Membership onboarding and renewals",
                    "Professional development coordination",
                    "Events, communications, and partner relations",
                    "Office support across Canada and Africa locations",
                ],
            ),
            (
                "Reach the team",
                "Use the Contact page for general inquiries, or email the office listed for your region.",
                [],
            ),
        ),
        "cta_label": "Contact Staff",
        "cta_href": "/contact",
    },
    {
        "slug": "governance",
        "title": "Governance",
        "description": "Learn how CAISBE is governed to serve members and advance the profession.",
        "lead": "CAISBE is governed to serve members, protect institutional trust, and advance the profession responsibly.",
        "sections": _sections(
            (
                "Governance principles",
                "",
                [
                    "Transparency and accountability to members",
                    "Clear roles for board, staff, and volunteers",
                    "Ethical stewardship of programs and partnerships",
                    "Alignment with mission and long-term impact",
                ],
            ),
            (
                "Policies and questions",
                "Review related policies such as our Privacy Policy, and contact us for governance documentation requests.",
                [],
            ),
        ),
        "cta_label": "Privacy Policy",
        "cta_href": "/privacy-policy",
    },
    {
        "slug": "volunteering",
        "title": "Volunteering",
        "description": "Discover ways to volunteer and contribute to CAISBE programs and community initiatives.",
        "lead": "Volunteers help deliver events, mentor peers, support chapters, and grow the professional community.",
        "sections": _sections(
            (
                "Ways to contribute",
                "",
                [
                    "Event and forum support",
                    "Chapter leadership and member engagement",
                    "Mentoring and knowledge sharing",
                    "Committees for programs, awards, and outreach",
                ],
            ),
            (
                "Get started",
                "Tell us your interests and availability—we will match you with opportunities that fit your skills. Email info@caisbe.org to begin.",
                [],
            ),
        ),
        "cta_label": "Get started",
        "cta_href": "mailto:info@caisbe.org?subject=Volunteer%20inquiry",
    },
    {
        "slug": "brand-assets",
        "title": "Brand Assets",
        "description": "Access CAISBE brand guidelines and assets for approved partner and media use.",
        "lead": "Approved partners and media can request CAISBE brand assets and usage guidance.",
        "sections": _sections(
            (
                "Available on request",
                "",
                [
                    "Primary logo files for digital and print",
                    "Color and typography guidance",
                    "Co-branding notes for events and partnerships",
                ],
            ),
            (
                "Usage expectations",
                "",
                [
                    "Do not alter logo proportions or colors without approval",
                    "Keep clear space around the mark",
                    "Use assets only for approved CAISBE-related communications",
                ],
            ),
            (
                "Request assets",
                "Email the communications team with your organization name, intended use, and deadline.",
                [],
            ),
        ),
        "cta_label": "Request Brand Assets",
        "cta_href": "/contact",
    },
]

RESOURCE_PAGES = [
    {
        "slug": "esg-facility-management",
        "title": "ESG + Facility Management",
        "description": "Understand how ESG principles intersect with facility management and sustainable operations.",
        "lead": "Environmental, social, and governance priorities show up daily in how facilities are run, measured, and improved.",
        "sections": _sections(
            (
                "FM and ESG intersection",
                "",
                [
                    "Energy efficiency, water, and waste reduction",
                    "Healthy indoor environments and equity of access",
                    "Transparent reporting and responsible procurement",
                    "Climate resilience and risk awareness",
                ],
            ),
            (
                "Build capability",
                "Use CAISBE learning programs and events to connect ESG strategy with operational practice.",
                [],
            ),
        ),
        "cta_label": "View Learning Programs",
        "cta_href": "/professional-development",
    },
    {
        "slug": "crisis-resource-center",
        "title": "Crisis Resource Center",
        "description": "Access guidance and resources to support facilities during crises and operational disruptions.",
        "lead": "Guidance to help facility teams prepare for and respond to disruptions that affect people, operations, and assets.",
        "sections": _sections(
            (
                "Resource themes",
                "",
                [
                    "Continuity planning and essential services",
                    "Communication with occupants and stakeholders",
                    "Health, safety, and emergency coordination",
                    "Recovery, lessons learned, and improvement cycles",
                ],
            ),
            (
                "Need support?",
                "Contact CAISBE for referrals, peer connections, or to share crisis-ready materials with the community.",
                [],
            ),
        ),
        "cta_label": "Contact Support",
        "cta_href": "/contact",
    },
    {
        "slug": "leader-tools",
        "title": "Leader Tools",
        "description": "Tools and resources to support chapter leaders, volunteers, and member engagement.",
        "lead": "Practical tools for chapter leaders and volunteers who grow local CAISBE communities.",
        "sections": _sections(
            (
                "Included tool types",
                "",
                [
                    "Meeting and event planning checklists",
                    "Member engagement ideas and templates",
                    "Onboarding notes for new volunteers",
                    "Reporting and communication prompts",
                ],
            ),
            (
                "Get the pack",
                "Leaders can request current templates and orientation materials from the institute team.",
                [],
            ),
        ),
        "cta_label": "Request Leader Tools",
        "cta_href": "/contact",
    },
    {
        "slug": "component-reports",
        "title": "Component Reports",
        "description": "Reports and updates supporting CAISBE components, chapters, and member communities.",
        "lead": "Updates that help components and chapters share progress, priorities, and learning across the network.",
        "sections": _sections(
            (
                "What reports support",
                "",
                [
                    "Chapter activity and membership snapshots",
                    "Program outcomes and event summaries",
                    "Shared priorities across regions",
                ],
            ),
            (
                "Questions",
                "For questions about published summaries or regional activity, contact the CAISBE team.",
                [],
            ),
        ),
        "cta_label": "Contact Us",
        "cta_href": "/contact",
    },
]


def _anchor(db: Session, slug: str, title: str) -> SitePage:
    path = f"/{slug}"
    existing = db.query(SitePage).filter(SitePage.path == path).first()
    if existing:
        return existing
    page = SitePage(
        title=title,
        menu_label=title,
        slug=slug,
        path=path,
        description="",
        lead="",
        sections=[],
        sort_order=0,
        show_in_menu=False,
        status="published",
    )
    db.add(page)
    db.flush()
    return page


def _child(db: Session, parent: SitePage, spec: dict, sort_order: int) -> None:
    path = f"{parent.path.rstrip('/')}/{spec['slug']}"
    if db.query(SitePage).filter(SitePage.path == path).first():
        return
    db.add(
        SitePage(
            parent_id=parent.id,
            title=spec["title"],
            menu_label=spec["title"][:120],
            slug=spec["slug"],
            path=path,
            description=spec["description"],
            lead=spec["lead"],
            sections=spec["sections"],
            cta_label=spec.get("cta_label"),
            cta_href=spec.get("cta_href"),
            sort_order=sort_order,
            show_in_menu=True,
            status="published",
        )
    )
    db.flush()


def seed_site_pages(db: Session) -> None:
    about = _anchor(db, "about", "About CAISBE")
    resources = _anchor(db, "resources", "Resources")
    for index, spec in enumerate(ABOUT_PAGES):
        _child(db, about, spec, (index + 1) * 10)
    for index, spec in enumerate(RESOURCE_PAGES):
        _child(db, resources, spec, (index + 1) * 10)
    _assign_paths(_pages(db))
    db.commit()
