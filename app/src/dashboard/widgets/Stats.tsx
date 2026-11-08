import { CardGrid } from '../../components/ui';
import { statTile } from '../stats';
import { DeltaChip, type WidgetProps } from './shared';

export function Stats({ size, options, ctx }: WidgetProps) {
  const ids = Array.isArray(options.tiles) ? options.tiles : [];
  const tiles = ids.map((id) => statTile(id, ctx)).filter((t) => !!t);
  return (
    <CardGrid as="ul" cols={size === 'l' ? 4 : 2} gap="tight" dense>
      {tiles.map((t) => (
        <li key={t.id} className="stack-label rounded-btn bg-surface p-s4">
          <span className="row-inline text-slate">{t.icon}<span className="text-small font-semibold">{t.label}</span></span>
          <span className="break-words text-h2 font-bold tabular">{t.value}</span>
          {t.sub && <span className="text-small text-slate">{t.sub}</span>}
          {t.delta && <div><DeltaChip delta={t.delta} range={ctx.range} /></div>}
        </li>
      ))}
    </CardGrid>
  );
}
