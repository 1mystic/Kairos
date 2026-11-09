"""Re-run every authored question's verification (python -m pipeline.jee_authored.verify)."""
from collections import Counter

from .build import load_all


def main() -> int:
    items = load_all()
    print("items imported (all inline asserts passed):", len(items))
    print("verification method:", dict(Counter(i["via"] for i in items)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
