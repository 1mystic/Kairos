"""Tests for the official-paper pipeline (acquire / extract / convert). No PDFs or network needed.

NOTE: written for the W7b pilot; not executed in the authoring session (owner CPU constraint).
"""
from __future__ import annotations

import pytest

from pipeline.acquire import fetch
from pipeline.extract import keys as K
from pipeline.extract import neet_text
from pipeline.extract import pdf_text as P
from pipeline.ingest import nta_convert as C


# ---------------------------------------------------------------- acquire

def test_allowlist_rejects_unofficial_hosts():
    for bad in ["https://www.aakash.ac.in/x.pdf", "https://www.pw.live/x.pdf", "http://nta.ac.in/x.pdf",
                "https://evil.example.com/nta.ac.in/x.pdf", "https://nta.ac.in.evil.com/x.pdf"]:
        with pytest.raises(SystemExit):
            fetch.check_host(bad)


def test_allowlist_accepts_official_hosts():
    for ok in ["https://nta.ac.in/Download/Notice/x.pdf", "https://cdnbbsr.s3waas.gov.in/s3abc/uploads/x.pdf",
               "https://jeemain.nta.nic.in/x.pdf", "https://neet.nta.nic.in/x.pdf"]:
        fetch.check_host(ok)


def test_redirect_to_other_host_is_refused():
    h = fetch._Redirect()
    with pytest.raises(SystemExit):
        h.redirect_request(None, None, 302, "Found", {}, "https://coaching.example.com/file.pdf")


def test_no_tls_bypass_in_fetch_source():
    import inspect
    src = inspect.getsource(fetch)
    assert "CERT_NONE" not in src and "_create_unverified_context" not in src and "check_hostname = False" not in src


# ---------------------------------------------------------------- text splitting

PAGE = """
    1.   First question text
         continues here :
         (1)   alpha
         (2)   beta
         (3)   gamma
         (4)   delta

    2.   Second question, 5. is not a question start
         (1)   a
         (2)   b
         (3)   c
         (4)   d
                    -o0o-
"""


def test_split_questions_sequential_numbers_only():
    ch = P.split_questions(PAGE, 2)
    assert sorted(ch) == [1, 2]
    assert "First question" in ch[1] and "Second question" in ch[2]


def test_split_options_requires_four_in_order():
    stem, opts = P.split_options(P.split_questions(PAGE, 2)[1])
    assert opts == ["alpha", "beta", "gamma", "delta"] or [o.strip() for o in opts] == ["alpha", "beta", "gamma", "delta"]
    assert P.split_options("no options here") is None
    assert P.split_options("(1) a\n(2) b\n(3) c") is None


def test_match_option_row_to_pairs():
    assert neet_text.match_option("(ii)    (iv)    (iii)   (i)") == "(a)-(ii), (b)-(iv), (c)-(iii), (d)-(i)"
    assert neet_text.match_option("Annelida") == "Annelida"


# ---------------------------------------------------------------- keys

NEET_KEY = """
BOOK : H3                                    EXAM DATE : 13.09.2020
Q.No Key    Q.No Key
 1   1      3     4
 2   Dropped
BOOK : E4                                    EXAM DATE : 13.09.2020
 1   2
"""


def test_neet_book_key_picks_block_and_specials(monkeypatch):
    monkeypatch.setattr(K, "_text", lambda pdf: NEET_KEY)
    key = K.neet_book_key("x.pdf", "H3")
    assert key[1] == "1" and key[3] == "4" and key[2] == "DROP"
    assert K.neet_book_key("x.pdf", "E4") == {1: "2"}
    with pytest.raises(KeyError):
        K.neet_book_key("x.pdf", "Z9")


JEE_KEY = """
                         NATIONAL TESTING AGENCY
   JEE (Main) - 2026 : SESSION - 2 FINAL ANSWER KEY
          Exam Date : 02.04.2026         Exam Shift : First
QUESTION ID CORRECT OPTION ID
6911211   6911213          69112126    69112187
69112121     4             695278261   Dropped
                         NATIONAL TESTING AGENCY
          Exam Date : 02.04.2026         Exam Shift : Second
6911211   999999999
"""


def test_nta_id_key_by_date_and_shift(monkeypatch):
    monkeypatch.setattr(K, "_text", lambda pdf: JEE_KEY)
    k = K.nta_id_key("x.pdf", "02.04.2026", "First")
    assert k["6911211"] == "6911213" and k["69112121"] == "4" and k["695278261"] == "DROP"
    assert K.nta_id_key("x.pdf", "02.04.2026", "Second") == {"6911211": "999999999"}


def test_paper_ids_option_order():
    txt = ("Question Number : 1 Question Id : 6911211 Question Type : MCQ Option Shuffling : Yes Display Question Number : Yes Is\n"
           "Options :\n\n6911211.\n\n6911212.\n\n6911213.\n\n6911214.\n\n"
           "Question Number : 2 Question Id : 6911212 Question Type : SA Display Question Number : Yes\n")
    ids = K.paper_ids(txt)
    assert ids[1] == ("6911211", ["6911211", "6911212", "6911213", "6911214"])
    assert ids[2] == ("6911212", [])


# ---------------------------------------------------------------- convert

def test_stable_id_deterministic_and_distinct():
    cfg = C.PILOTS["neet_ug_2020_H3"]
    assert C.stable_id(cfg, 1) == C.stable_id(cfg, 1)
    assert C.stable_id(cfg, 1) != C.stable_id(cfg, 2)
    assert C.stable_id(cfg, 1).startswith("q_")
    assert C.stable_id(cfg, 1) != C.stable_id(C.PILOTS["jee_main_2026_0402_s1"], 1)


def test_chapter_for_hint_none_means_no_chapter():
    assert C.chapter_for("q_x", "CHE", "text", "NONE") == (None, "no_chapter")
    assert C.chapter_for("q_x", "BOT", "text", "BOT.CELL") == ("BOT.CELL", "hint")
    assert C.chapter_for("q_zz_unknown", "BOT", "text", None)[0] is None  # bio has no keyword rules: never guessed
