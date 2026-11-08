import { statTile } from '../stats';
import { DeltaChip, type WidgetProps } from './shared';

export function Stats({ size, options, ctx }: WidgetProps) {
  const ids = Array.isArray(options.tiles) ? options.tiles : [];
  const tiles = ids.map((id) => statTile(id, ctx)).filter((t) => !!t);
  return (
    <ul className={`grid gap-s3 ${size === 'l' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
      {tiles.map((t) => (
        <li key={t.id} className="stack gap-s2 rounded-btn bg-surface p-s4">
          <span className="row gap-s2 text-slate">{t.icon}<span className="text-small font-semibold">{t.label}</span></span>
          <span className="break-words text-h2 font-bold tabular">{t.value}</span>
          {t.sub && <span className="text-small text-slate">{t.sub}</span>}
          {t.delta && <div><DeltaChip delta={t.delta} range={ctx.range} /></div>}
        </li>
      ))}
    </ul>
  );
}
