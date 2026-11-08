import { LinkButton, ProgressBar } from '../../components/ui';
import type { WidgetProps } from './shared';

export function Upload({ ctx }: WidgetProps) {
  const u = ctx.bundle.usage;
  return (
    <div className="stack items-start gap-s3 self-stretch">
      <p className="text-body">Practise from your own notes and papers. Photos or PDFs become questions you can review.</p>
      {u && (
        <div className="stack w-full gap-s2">
          <div className="flex justify-between text-small"><span className="text-slate">Questions saved</span><span className="font-semibold tabular">{u.questions} of {u.limit}</span></div>
          <ProgressBar label="Questions saved" value={u.questions} max={u.limit} />
        </div>
      )}
      <LinkButton to="/upload" size="sm" variant="secondary">Add your own questions</LinkButton>
    </div>
  );
}
