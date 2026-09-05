"""Seed published FMC and PMC courses (idempotent)."""

from app.seed_fmc_pmc import run

if __name__ == "__main__":
    run()
