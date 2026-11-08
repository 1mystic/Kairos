"""Repo-relative paths shared by the pipeline modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAXONOMY_PATH = ROOT / "content" / "taxonomy" / "taxonomy.json"
BLUEPRINTS_DIR = ROOT / "content" / "blueprints"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
DEFAULT_SRC = FIXTURES / "questions"
DEFAULT_PAPERS = FIXTURES / "papers"
DEFAULT_OUT = ROOT / "app" / "public" / "bank"
