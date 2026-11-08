# JEEBench attribution

Part of the Kairos starter question bank is derived from **JEEBench**.

- **Dataset:** JEEBench, 515 text-only JEE Advanced (2016-2023) problems in Physics, Chemistry and Mathematics with gold answers.
- **Authors:** Daman Arora, Himanshu Gaurav Singh, Mausam (DAIR group, IIT Delhi).
- **Repository:** https://github.com/dair-iitd/jeebench (commit `a9af8bf354887043bd280a617c8716ef54e7aaec`, file `data.zip` -> `data/dataset.json`)
- **Also published as:** Hugging Face `daman1209arora/jeebench`
- **Licence:** MIT, Copyright (c) 2023 Data Analytics and Intelligence Research (DAIR) Group, IIT Delhi. Full text in `LICENSE` next to this file. The MIT licence requires that the copyright notice and licence text accompany copies or substantial portions of the software/data; that is what `LICENSE` is for. The README asks for citation when the dataset is used (below).
- **Retrieved:** 2026-11-08 (`dataset.json` sha256 `c9e46ee7585ff83711e89f18e067ee447c88c08602f837b328c5a169c3011de0`, copied unmodified into this directory so the ingest is reproducible offline)

## Citation

```bibtex
@inproceedings{arora-etal-2023-llms,
    title = "Have {LLM}s Advanced Enough? A Challenging Problem Solving Benchmark For Large Language Models",
    author = "Arora, Daman  and Singh, Himanshu  and {Mausam}",
    booktitle = "Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing",
    month = dec, year = "2023", address = "Singapore",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2023.emnlp-main.468",
    doi = "10.18653/v1/2023.emnlp-main.468", pages = "7527--7543",
}
```

## What Kairos changed (`pipeline/ingest/jeebench.py`)

- Mapped question types: MCQ -> SCQ, MCQ(multiple) -> MSQ, Integer -> INT, Numeric -> NVQ (tolerance 10^-max(2, decimal places of gold), i.e. 0.01 for the usual "correct up to the 2nd decimal digit").
- Split the (A)-(D) / [A]-[D] option lines out of the question text into structured options.
- Normalised LaTeX delimiters (`\[..\]` -> `$$..$$`, `\(..\)` -> `$..$`), converted `\textbf`/`\textit` outside math to markdown, and converted whole-segment plain formulas such as `\mathrm{H}_{2} \mathrm{O}` to `\ce{H2O}`. Nothing else in the text is edited.
- Added our own metadata: stable id (`q_` + sha1 prefix of the source key), chapter/subject from the Kairos taxonomy (keyword rules + hand review, `pipeline/tag/`), difficulty prior, skills, `appearances` (`JEE_ADV`, year, paper number), `source` (`kind: dataset`, `license: MIT`, URL).
- Dropped questions that cannot be shown faithfully (LaTeX tables/environments, text-mode LaTeX other than bold/italic, option lists that do not parse, math that fails the sanity check, duplicates). They are listed with reasons in `pipeline/quarantine/jeebench_rejected.json` and never published.
- JEEBench carries no worked solutions; Kairos publishes none for these questions.

## Caveat

The MIT licence covers the JEEBench release. The underlying problems are the published JEE Advanced papers set by the IITs; JEEBench's gold answers follow the official keys. Kairos uses them as practice material in line with the project content-source policy (official papers + keys, MIT datasets, user uploads, own solutions). Gold answers are taken as given and have not been independently re-solved.
