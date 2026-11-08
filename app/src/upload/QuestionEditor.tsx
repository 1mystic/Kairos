import { useState } from 'react';
import { QUESTION_TYPES, type Issue, type UserQuestion } from '@kairos/core';
import { Button, Input, IconButton, SelectField, TextareaField, Field } from '../components/ui';
import { CloseIcon } from '../components/icons';
import { chapterGroups } from './taxonomy';
import { patchQuestion } from './review';

export type EditPatch = Parameters<typeof patchQuestion>[1];

const NUMERIC = new Set(['NVQ', 'INT']);
const TYPE_LABEL: Record<string, string> = {
  SCQ: 'Single correct', MSQ: 'Multiple correct', NVQ: 'Numerical', INT: 'Integer', MATCH: 'Match the columns',
  ASSERT_REASON: 'Assertion and reason', PARA_CHILD: 'Passage question',
};

const nextKey = (keys: string[]) => String.fromCharCode(65 + keys.length);

export function QuestionEditor({ q, issues, exam, onChange }: { q: UserQuestion; issues: readonly Issue[]; exam: string; onChange(patch: EditPatch): void }) {
  const err = (field: string) => issues.find((i) => i.field === field && i.severity === 'error')?.message;
  const optErr = issues.find((i) => i.field?.startsWith('options') && i.severity === 'error')?.message;
  const numeric = NUMERIC.has(q.type);
  const options = q.options ?? [];
  const ans = q.answer;
  const keys = ans && 'keys' in ans ? ans.keys : [];
  const [valueText, setValueText] = useState(ans && 'value' in ans ? String(ans.value) : '');
  const [tolText, setTolText] = useState(ans && 'value' in ans && ans.tol ? String(ans.tol) : '');

  const setNumeric = (v: string, t: string) => {
    setValueText(v);
    setTolText(t);
    const n = Number(v);
    if (v.trim() === '' || !Number.isFinite(n)) return onChange({ answer: null });
    const tol = Number(t);
    onChange({ answer: t.trim() !== '' && Number.isFinite(tol) && tol > 0 ? { value: n, tol } : { value: n } });
  };
  const setOptions = (next: { key: string; text: string }[]) => {
    const live = new Set(next.map((o) => o.key));
    const kept = keys.filter((k) => live.has(k));
    onChange({ options: next, ...(kept.length !== keys.length ? { answer: kept.length ? { keys: kept } : null } : {}) });
  };
  const pick = (k: string) => {
    if (q.type === 'MSQ') {
      const next = keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k];
      onChange({ answer: next.length ? { keys: next } : null });
    } else onChange({ answer: { keys: [k] } });
  };

  return (
    <div className="stack gap-base" aria-label="Edit question">
      <SelectField label="Type" value={q.type} onChange={(e) => onChange({ type: e.target.value as UserQuestion['type'] })}>
        {QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
      </SelectField>

      <TextareaField label="Question" value={q.stem} error={err('stem')} onChange={(e) => onChange({ stem: e.target.value })} rows={5} />

      {!numeric && (
        <fieldset className="stack gap-tight">
          <legend className="text-small font-semibold">Options</legend>
          {options.map((o, i) => (
            <div key={i} className="u-opt-row">
              <span className="opt-key mx-auto" aria-hidden="true">{o.key}</span>
              <Input
                aria-label={`Option ${o.key}`}
                value={o.text}
                invalid={issues.some((x) => x.field === `options.${i}` && x.severity === 'error')}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
              <IconButton label={`Remove option ${o.key}`} variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i).map((x, j) => ({ ...x, key: String.fromCharCode(65 + j) })))}>
                <CloseIcon width={20} height={20} />
              </IconButton>
            </div>
          ))}
          {optErr && <p role="alert" className="text-small text-accent-ink">{optErr}</p>}
          <div><Button size="sm" variant="secondary" onClick={() => setOptions([...options, { key: nextKey(options.map((o) => o.key)), text: '' }])}>Add option</Button></div>
        </fieldset>
      )}

      <fieldset className="stack gap-tight">
        <legend className="text-small font-semibold">Answer (from your key)</legend>
        {numeric ? (
          <div className="grid gap-s3 xs:grid-cols-2">
            <Field label="Value" inputMode="decimal" value={valueText} error={err('answer')} onChange={(e) => setNumeric(e.target.value, tolText)} />
            {q.type === 'NVQ' && <Field label="Tolerance (optional)" inputMode="decimal" value={tolText} onChange={(e) => setNumeric(valueText, e.target.value)} />}
          </div>
        ) : (
          <>
            <div className="row gap-tight">
              {options.map((o) => (
                <label key={o.key} className="u-pick">
                  <input type={q.type === 'MSQ' ? 'checkbox' : 'radio'} name={`ans-${q.id}`} checked={keys.includes(o.key)} onChange={() => pick(o.key)} />
                  {o.key}
                </label>
              ))}
              <Button size="sm" variant="ghost" onClick={() => onChange({ answer: null })}>No answer</Button>
            </div>
            {err('answer') && <p role="alert" className="text-small text-accent-ink">{err('answer')}</p>}
          </>
        )}
      </fieldset>

      <SelectField label="Chapter" value={q.tax?.chapter ?? ''} error={err('chapter')} onChange={(e) => onChange({ chapter: e.target.value })}>
        <option value="">Choose a chapter</option>
        {chapterGroups(exam).map((g) => (
          <optgroup key={g.subject} label={g.name}>
            {g.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        ))}
      </SelectField>

      <TextareaField label="Solution (optional)" value={q.solution ?? ''} error={err('solution')} onChange={(e) => onChange({ solution: e.target.value || null })} rows={4} />
    </div>
  );
}
