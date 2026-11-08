"""Repo-relative paths shared by the pipeline modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAXONOMY_PATH = ROOT / "content" / "taxonomy" / "taxonomy.json"
BLUEPRINTS_DIR = ROOT / "content" / "blueprints"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
DEFAULT_SRC = FIXTURES / "questions"
DEFAULT_PAPERS = FIXTURES / "papers"
DEFAULT_OUT = ROOT / "app" / "public" / "bank"
BANK_SRC = Path(__file__).resolve().parent / "bank_src"  # ingested (dataset/official/user) questions
DEFAULT_SRCS = [DEFAULT_SRC, BANK_SRC]  # what `python -m pipeline.publish` reads by default
SOURCES_DIR = ROOT / "content" / "sources"
