# GATE DA 2027 Question Bank: agent guide

Files
- `GATE_DA_2027_QBank.jsonl`: 1206 records, one JSON object per line (primary file for agents).
- `GATE_DA_2027_QBank.md`: the same content as one Markdown document.
- `figures/`: 20 diagrams as PNG (200 dpi). Every figure also carries its TikZ source.

Counts by subject: Probability and Statistics 160, Linear Algebra 144, Calculus and Optimisation 150, Programming, Data Structures and Algorithms 144, Database Management and Warehousing 144, Machine Learning 144, Artificial Intelligence 160, General Aptitude and Full Mock Sets 160.
Counts by type: NAT 708, MCQ 314, MSQ 184.

Record schema (JSONL)
| field | meaning |
|---|---|
| id | question number as printed in the workbooks, e.g. `Q7.12` (day 7, question 12) |
| subject, workbook_days, day, day_title, section | where the question sits in the syllabus |
| type | `MCQ` (one correct option), `MSQ` (one or more correct, all must be marked), `NAT` (numerical) |
| marks | 1 or 2 (GATE weighting); difficulty 1 to 3 |
| topic | short topic label (present for Days 1-4 only) |
| contexts | shared material the question depends on (dataset, table, graph, conventions): list of {context_id, scope, text, figures}. Already inlined, so each record is self-contained |
| question | stem; math in LaTeX; tables as LaTeX tabular; code in fenced blocks; `____` marks the NAT blank; `[FIGURE n: path]` marks where a figure appears |
| options | {"A": ..., "B": ..., "C": ..., "D": ...} for MCQ/MSQ |
| answer | final answer from the answer key: letters (`B`, `A, C, D`), a number, or an accepted range `lo–hi` |
| answer_detail | the answer as written in the solution header (may add the value or reasoning) |
| solution | worked solution; labelled parts `Idea:`, `Work:`, `Trap:` (common mistake), `Note:` (PYQ variants, generalisations), `Shortcut:` |
| figures | list of {file, tikz, where} with where = question or solution |
| key | internal slug used for cross-references |

Grading rules: MCQ negative marking 1/3 (1 mark) and 2/3 (2 marks); MSQ and NAT have no negative marking; MSQ gets no partial credit.
A NAT answer given as a range accepts any value within it. Cross-references like "the network of Q28.03" refer to ids in this file.
