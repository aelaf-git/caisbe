"""Seed five chapter quizzes per chapter."""

from app.db import SessionLocal
from app.seed_chapter_quizzes import run

if __name__ == "__main__":
    run()
