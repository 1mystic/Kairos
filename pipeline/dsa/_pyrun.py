"""Sandbox-ish runner executed in a subprocess: reads {code, tests:[str]} on stdin, prints a JSON list of
{ok, repr, err} (one per test; each test = statements that set `res`)."""
import json
import signal
import sys

from pipeline.dsa._prelude import PRELUDE


class TO(Exception):
    pass


def _alarm(*_):
    raise TO()


signal.signal(signal.SIGALRM, _alarm)


def one(code, test):
    ns = {}
    exec(PRELUDE, ns)
    signal.alarm(5)
    try:
        exec(code, ns)
        exec(test, ns)
        return {"ok": True, "repr": repr(ns["res"]), "type": type(ns["res"]).__name__}
    except TO:
        return {"ok": False, "err": "timeout"}
    except BaseException as e:  # noqa
        return {"ok": False, "err": f"{type(e).__name__}: {e}"[:200]}
    finally:
        signal.alarm(0)


def main():
    d = json.load(sys.stdin)
    out = [one(d["code"], t) for t in d["tests"]]
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()
