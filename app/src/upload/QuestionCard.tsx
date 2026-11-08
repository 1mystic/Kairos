import { memo, useState } from 'react';
import type { UserQuestion } from '@kairos/core';
import { Button, Card, Chip } from '../components/ui';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/icons';
import type { CropResult, CropToWebp } from './crop';
import { CropTool } from './CropTool';
import type { PageImage } from './pages';
import { QuestionEditor, type EditPatch } from './QuestionEditor';
import { chipsFor, type ChipSpec, type ReviewItem } from './review';
import { UserQuestionPreview } from './UserQuestionPreview';

export function IssueChip({ chip }: { chip: ChipSpec }) {
  if (chip.level === 'error')
    return <span className="u-chip-error" title={chip.title}><AlertIcon width={14} height={14} />{chip.label}</span>;
  if (chip.level === 'warn') return <span title={chip.title}><Chip tone="accent" icon={<InfoIcon width={14} height={14} />}>{chip.label}</Chip></span>;
  return <span title={chip.title}><Chip tone="primary" icon={<CheckIcon width={14} height={14} />}>{chip.label}</Chip></span>;
}

export interface QuestionCardProps {
  item: ReviewItem;
  exam: string;
  selected: boolean;
  urls: ReadonlyMap<string, string>;
  pages: readonly PageImage[];
  cropToWebp: CropToWebp;
  onToggle(id: string): void;
  onEdit(id: string, patch: EditPatch): void;
  onCrop(id: string, k: number, res: CropResult): void;
  onNeedPages?(): void;
}

function QuestionCardBase({ item, exam, selected, urls, pages, cropToWebp, onToggle, onEdit, onCrop, onNeedPages }: QuestionCardProps) {
  const { q, issues } = item;
  const [editing, setEditing] = useState(false);
  const [cropK, setCropK] = useState<number | null>(null);
  const errors = issues.filter((i) => i.severity === 'error');
  const selfCheck = q.status === 'needs_answer';

  return (
    <Card as="article" aria-label={`Question ${q.n}`} className="u-qcard" data-qid={q.id}>
      <div className="u-qhead">
        <label className="u-check">
          <input type="checkbox" checked={selected} onChange={() => onToggle(q.id)} aria-label={`Select question ${q.n}`} />
        </label>
        <h3 className="text-h3">Q{q.n}</h3>
        <div className="row-inline min-w-0 flex-1">
          {chipsFor(issues).map((c) => <IssueChip key={c.code + c.level} chip={c} />)}
          {selfCheck && <Chip>Self-check only</Chip>}
        </div>
        <Button size="sm" variant={editing ? 'primary' : 'secondary'} aria-expanded={editing} onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : 'Edit'}
        </Button>
      </div>

      {errors.length > 0 && (
        <ul className="stack-label text-small" aria-label="Problems to fix">
          {errors.slice(0, 3).map((e, i) => <li key={i} className="row-inline"><AlertIcon width={16} height={16} className="shrink-0 text-accent-ink" />{e.message}</li>)}
        </ul>
      )}

      <div className="u-qbody" data-editing={editing}>
        <UserQuestionPreview question={q} urls={urls} />
        {editing && <QuestionEditor q={q} issues={issues} exam={exam} onChange={(p) => onEdit(q.id, p)} />}
      </div>

      {q.pending_figures.length > 0 && (
        <div className="stack-card">
          <div className="row-inline">
            {q.pending_figures.map((f) => (
              <Button key={f.k} size="sm" variant={cropK === f.k ? 'primary' : 'secondary'} onClick={() => setCropK(cropK === f.k ? null : f.k)}>
                Crop figure {f.k}
              </Button>
            ))}
          </div>
          {cropK != null && q.pending_figures.find((f) => f.k === cropK) && (
            <CropTool
              key={cropK}
              figure={q.pending_figures.find((f) => f.k === cropK)!}
              pages={pages}
              cropToWebp={cropToWebp}
              onNeedPages={onNeedPages}
              onSave={(res) => { onCrop(q.id, cropK, res); setCropK(null); }}
            />
          )}
        </div>
      )}
    </Card>
  );
}

export const QuestionCard = memo(QuestionCardBase);
export type { UserQuestion };
