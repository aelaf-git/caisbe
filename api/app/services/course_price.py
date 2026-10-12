"""One writer for the price students are charged."""

from sqlalchemy.orm.attributes import flag_modified

from app.models import Course


def set_live_course_price(course: Course, cents: int) -> None:
    """Store the price on the course row and mirror it into any open draft.

    Checkout reads ``courses.price_cents``. A published course also keeps a
    draft of unpublished title and description edits. The draft copy of the
    price is only a mirror, so saving those edits cannot restore an older price.
    """
    course.price_cents = max(0, int(cents))
    if not course.draft_meta:
        return
    draft = dict(course.draft_meta)
    draft["price_cents"] = course.price_cents
    course.draft_meta = draft
    flag_modified(course, "draft_meta")
