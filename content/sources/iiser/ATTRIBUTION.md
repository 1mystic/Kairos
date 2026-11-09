# IISER Aptitude Test (IAT) papers (attribution)

Status: **nothing downloaded or used (W7b pilot).**

IAT past papers and answer keys are published by the IISER admission portal (`iiseradmission.in`, e.g. `https://iiseradmission.in/assets/pdfs/2024_Eng_IAT.pdf`, `.../English-Key_IAT-2025.pdf`). That host fails TLS certificate verification (curl exit 60 and Python `CERTIFICATE_VERIFY_FAILED`: "unable to get local issuer certificate"; checked 2026-11-08 and 2026-11-09, with and without `www.`). Per the project rule, verification is never disabled and third-party copies are not substituted, so the host is recorded as **unavailable** in `papers_manifest.json`. Other IISER sites (`iiserb.ac.in`, `iiserpune.ac.in`, `iisermohali.ac.in`) verify cleanly but no IAT past papers were found on them.

Paths to unblock (owner decision): wait for IISER to fix the certificate chain; ask IISER admissions for the files directly; or download manually from a browser that trusts the site and place the PDFs under `pipeline/raw/iat/<year>/` (then the same acquire/extract/convert flow applies, with the sha256 recorded in the manifest).

Policy statement: public exam papers published by IISER; would be used per the project source policy (official papers + official final keys only). Takedown / contact: `TODO: project contact email` (placeholder).
