"""Download official papers / answer keys listed in the sources manifests.

    python -m pipeline.acquire.fetch [--manifest content/sources/nta/papers_manifest.json ...]
                                     [--only ID ...] [--sleep 3] [--dry-run]

Rules (code-enforced, see CLAUDE.md content policy):
  * ONLY hosts in ALLOWED_HOSTS (official NTA / IISER / NIC-government CDN). Any other host, including after a
    redirect, is a hard failure (SystemExit). No coaching / publisher sites, ever.
  * TLS verification is always on (default SSL context). A certificate failure marks the host unavailable; it is
    never bypassed and there is no flag to do so.
  * Sequential, rate-limited (default 3 s between requests), resumable (existing file with matching sha256 is skipped).
  * Only entries with ``"download": true`` and a ``url`` are fetched. The file must start with ``%PDF``.
  * sha256 / bytes / pages / retrieved are written back into the manifest. PDFs go to pipeline/raw/ (gitignored).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

from ..paths import ROOT

# Official hosts. cdnbbsr.s3waas.gov.in is the NIC (Govt. of India) CDN that serves the files linked from
# jeemain.nta.nic.in / neet.nta.nic.in. IISER hosts are listed so they can be tried, but iiseradmission.in
# currently fails TLS verification and is therefore recorded as unavailable.
ALLOWED_HOSTS = frozenset({
    "jeemain.nta.nic.in", "neet.nta.nic.in", "nta.ac.in", "www.nta.ac.in", "cdnbbsr.s3waas.gov.in",
    "iiseradmission.in", "www.iiseradmission.in", "www.iiserb.ac.in", "www.iiserpune.ac.in", "www.iisermohali.ac.in",
})
RAW = ROOT / "pipeline" / "raw"
DEFAULT_MANIFESTS = [ROOT / "content/sources/nta/papers_manifest.json", ROOT / "content/sources/iiser/papers_manifest.json"]
UA = "Mozilla/5.0 (kairos-acquire; contact: see content/sources/nta/ATTRIBUTION.md)"
TODAY = "2026-11-08"


def check_host(url: str) -> None:
    host = urlparse(url).hostname or ""
    if urlparse(url).scheme != "https" or host not in ALLOWED_HOSTS:
        raise SystemExit(f"REFUSED: {url} is not an https URL on the official-host allow-list")


class _Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_host(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def local_path(entry: dict) -> Path:
    exam = entry["exam"].lower()
    name = Path(urlparse(entry["url"]).path).name
    return RAW / exam / str(entry["year"]) / f"{entry['id']}__{name}"


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def pdf_pages(p: Path) -> int | None:
    out = subprocess.run(["pdfinfo", str(p)], capture_output=True, text=True).stdout
    m = re.search(r"^Pages:\s+(\d+)", out, re.M)
    return int(m.group(1)) if m else None


def download(url: str, dest: Path) -> None:
    check_host(url)
    ctx = ssl.create_default_context()  # verification ON, never altered
    opener = urllib.request.build_opener(_Redirect, urllib.request.HTTPSHandler(context=ctx))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with opener.open(req, timeout=90) as r:
        data = r.read()
    if not data.startswith(b"%PDF"):
        raise ValueError("response is not a PDF (no %PDF header)")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    tmp.write_bytes(data)
    tmp.replace(dest)


def run(manifests: list[Path], only: set[str], sleep: float, dry: bool) -> int:
    fails = 0
    first = True
    for mp in manifests:
        if not mp.exists():
            continue
        man = json.loads(mp.read_text(encoding="utf-8"))
        changed = False
        for e in man["entries"]:
            if not e.get("download") or not e.get("url") or (only and e["id"] not in only):
                continue
            check_host(e["url"])
            dest = local_path(e)
            if dest.exists() and e.get("sha256") and sha256_file(dest) == e["sha256"]:
                print(f"skip   {e['id']} (present, sha256 ok)")
                continue
            if dry:
                print(f"would fetch {e['url']} -> {dest.relative_to(ROOT)}")
                continue
            if not first:
                time.sleep(sleep)
            first = False
            try:
                download(e["url"], dest)
            except (ssl.SSLError, urllib.error.URLError, ValueError, OSError) as ex:
                reason = str(getattr(ex, "reason", ex))
                e["status"] = f"host unavailable / fetch failed: {reason}"
                e.pop("sha256", None)
                print(f"FAIL   {e['id']}: {reason}")
                fails += 1
                changed = True
                continue
            if e.get("sha256") and e["sha256"] != sha256_file(dest):
                print(f"WARN   {e['id']}: sha256 changed upstream (was {e['sha256'][:12]})")
            e.update(sha256=sha256_file(dest), bytes=dest.stat().st_size, pages=pdf_pages(dest), retrieved=TODAY,
                     local=str(dest.relative_to(ROOT)))
            print(f"ok     {e['id']}  {e['bytes']} B  {e['pages']} pp")
            changed = True
        if changed:
            mp.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return 1 if fails else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.acquire.fetch", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", type=Path, action="append")
    ap.add_argument("--only", nargs="*", default=[])
    ap.add_argument("--sleep", type=float, default=3.0)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    return run(a.manifest or DEFAULT_MANIFESTS, set(a.only), a.sleep, a.dry_run)


if __name__ == "__main__":
    sys.exit(main())
