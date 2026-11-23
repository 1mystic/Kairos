"""Plots for docs/results from the sim study JSONs: python -m pipeline.ml.plot_results"""
import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

R = "docs/results"
INK, MUTED, SURF, BLUE = "#0b0b0b", "#52514e", "#fcfcfb", "#2a78d6"
NEW = {"planner_unc", "planner_learned", "planner_unc_learned"}


def dot_ci(rows, title, xlabel, out):
    """rows: [(label, mean, lo, hi, highlight)] -> horizontal dot + 95% CI chart."""
    fig, ax = plt.subplots(figsize=(7, 0.45 * len(rows) + 1.2), facecolor=SURF)
    ax.set_facecolor(SURF)
    for i, (lab, m, lo, hi, hl) in enumerate(rows):
        c = BLUE if hl else MUTED
        ax.plot([lo, hi], [i, i], color=c, lw=2, solid_capstyle="round")
        ax.plot([m], [i], "o", color=c, ms=8, mec=SURF, mew=2)
        ax.text(hi, i, f"  {m:+.2f}", va="center", color=INK, fontsize=9)
    ax.axvline(0, color=MUTED, lw=1, ls="--")
    ax.set_yticks(range(len(rows)), [r[0] for r in rows], color=INK)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, color=MUTED)
    ax.set_title(title, color=INK, loc="left", fontsize=11)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.grid(axis="x", color="#e6e5e1", lw=0.8)
    ax.set_axisbelow(True)
    lo_all = min(r[2] for r in rows)
    hi_all = max(r[3] for r in rows)
    pad = 0.12 * (hi_all - lo_all)
    ax.set_xlim(min(0, lo_all) - pad, hi_all + 2 * pad)
    fig.tight_layout()
    fig.savefig(out, dpi=150, facecolor=SURF)
    plt.close(fig)


def main():
    p = json.load(open(os.path.join(R, "sim_planner.json")))
    vs = p["paired"]["random"]
    rows = [(n, vs[n]["gain"]["mean"], *vs[n]["gain"]["ci95"], n in NEW) for n in p["policies"] if n != "random"]
    rows.sort(key=lambda r: -r[1])
    dot_ci(rows, "Exam-day score gain vs random (5,000 paired student runs)",
           "difference in predicted marks (mean, 95% bootstrap CI)", os.path.join(R, "policy_gain.png"))
    vp = p["paired"]["planner"]
    rows = [(n, vp[n]["gain"]["mean"], *vp[n]["gain"]["ci95"], n in NEW) for n in p["policies"] if n != "planner"]
    rows.sort(key=lambda r: -r[1])
    dot_ci(rows, "Exam-day score gain vs the current planner", "difference in predicted marks (mean, 95% bootstrap CI)",
           os.path.join(R, "policy_gain_vs_planner.png"))
    ab_path = os.path.join(R, "sim_ablation.json")
    if os.path.exists(ab_path):
        a = json.load(open(ab_path))
        va = a["paired"]["planner_unc"]
        rows = [(n.replace("planner_unc_no_", "without "), va[n]["gain"]["mean"], *va[n]["gain"]["ci95"], False) for n in a["policies"] if n != "planner_unc"]
        rows.sort(key=lambda r: r[1])
        dot_ci(rows, "Ablation: removing one signal from the uncertainty planner", "change in exam-day gain vs full planner_unc (marks)",
               os.path.join(R, "ablation.png"))


if __name__ == "__main__":
    main()
