import { useState } from 'react';
import { Select } from '../../components/ui';
import { BarChart, type Bar } from '../charts/BarChart';
import type { DayMetrics } from '../data';
import { formatDay } from '../range';
import { TREND_METRICS } from '../registry';
import { CardEmpty, DeltaChip, type WidgetProps } from './shared';
import { ChartIcon } from '../../components/icons';

type Metric = 'questions' | 'accuracy' | 'minutes' | 'mastery';
const UNIT: Record<Metric, string> = { questions: 'questions', accuracy: '% accuracy', minutes: 'minutes', mastery: '% mastery' };
const val = (d: DayMetrics, m: Metric): number | null => (m === 'questions' ? d.questions : m === 'minutes' ? d.minutes : m === 'accuracy' ? d.accuracy : d.mastery);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Trend({ size, options, ctx }: WidgetProps) {
  const [metric, setMetric] = useState<Metric>((options.metric as Metric) ?? 'questions');
  const [picked, setPicked] = useState<string | null>(null);
  const days = ctx.data.trend;
  const sel = picked && days.some((d) => d.date === picked) ? picked : ctx.data.range.end;
  if (!ctx.data.hasAnyData) {
    return <CardEmpty title="Your trend will build up here" to="/practice" cta="Start practising" icon={<ChartIcon />}>Each day you practise adds a bar. One short session is enough to begin.</CardEmpty>;
  }
  const monthly = ctx.range.kind === 'month';
  const bars: Bar[] = days.map((d) => {
    const v = val(d, metric);
    return { key: d.date, label: monthly ? String(Number(d.date.slice(8))) : WD[new Date(`${d.date}T00:00:00Z`).getUTCDay()]!, value: v, aria: `${formatDay(d.date)}: ${v === null ? 'no data' : `${v} ${UNIT[metric]}`}` };
  });
  const sd = days.find((d) => d.date === sel)!;
  const sv = val(sd, metric);
  const total = ctx.data.totals;
  const delta = metric === 'questions' ? ctx.data.deltas.questions : metric === 'minutes' ? ctx.data.deltas.minutes : metric === 'accuracy' ? ctx.data.deltas.accuracy : null;
  const head = metric === 'questions' ? `${total.questions} questions` : metric === 'minutes' ? `${total.minutes} minutes` : metric === 'accuracy' ? (total.accuracy === null ? 'No answers' : `${total.accuracy}% accuracy`) : null;
  return (
    <div className="stack gap-s4">
      <div className="row-between">
        <div className="stack gap-s1">
          {head && <span className="text-h2 font-bold tabular">{head}</span>}
          <div><DeltaChip delta={delta} range={ctx.range} /></div>
        </div>
        <div className="w-56"><Select aria-label="Trend metric" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>{TREND_METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></div>
      </div>
      <BarChart
        bars={bars} selected={sel} onSelect={setPicked} every={monthly ? 5 : 1} height={size === 'l' ? 'h-48' : 'h-32'}
        summary={`${TREND_METRICS.find((m) => m.value === metric)!.label} by day, ${formatDay(days[0]!.date, false)} to ${formatDay(days[days.length - 1]!.date)}. ${bars.find((b) => b.key === sel)?.aria ?? ''}`}
        caption={`${TREND_METRICS.find((m) => m.value === metric)!.label} by day`}
      />
      <p className="text-small text-slate" aria-live="polite">{formatDay(sel)}: <span className="font-semibold text-ink tabular">{sv === null ? 'no data' : `${sv} ${UNIT[metric]}`}</span></p>
    </div>
  );
}
