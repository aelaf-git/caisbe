"""Database access conventions for CAISBE API.

Routers must use SQLAlchemy ORM queries or ``sqlalchemy.text()`` with bound
``:parameters``. Never build SQL with f-strings or string concatenation from
user input.
"""

DB_ACCESS_RULES = (
    "Use SQLAlchemy ORM or sqlalchemy.text() with bound :parameters only. "
    "Never interpolate user input into SQL strings."
)
