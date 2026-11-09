"""Re-run every authored question's verification (python -m pipeline.gate_da.verify.run).

Verification lives next to each item in pipeline/gate_da/authored/<group>.py (answers computed by code and asserted
against an independent second method at import time); this runner imports them all and prints coverage."""
from collections import Counter

from ..build_authored import load_all


def main() -> int:
    items = load_all()
    print("items imported (all in-line asserts passed):", len(items))
    print("verification method:", dict(Counter(i["via"] for i in items)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
