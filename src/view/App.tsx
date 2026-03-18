import { useEffect, useRef, useState, useCallback } from 'react';
import type { ScheduleData, ScheduleBlock } from './types';
import { timeToMin, pad, PX_PER_MIN } from './utils';
import { setupPip } from './pip';

type Props = {
  data: ScheduleData;
};

export default function App({ data }: Props) {
  const { title, blocks } = data;

  const [debug] = useState(() =>
    new URLSearchParams(window.location.search).has('debug'),
  );
  const [sliderValue, setSliderValue] = useState(780);
  const [useSimulated, setUseSimulated] = useState(debug);
  const [, setTick] = useState(0);

  const pipBtnRef = useRef<HTMLButtonElement>(null);
  const pipSetupDone = useRef(false);

  // Tick every minute for real-time updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Setup PiP
  useEffect(() => {
    if (pipBtnRef.current && !pipSetupDone.current) {
      setupPip(pipBtnRef.current, blocks);
      pipSetupDone.current = true;
    }
  }, [blocks]);

  const getNowMin = useCallback((): number => {
    if (useSimulated) return sliderValue;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [useSimulated, sliderValue]);

  const nowMin = getNowMin();

  if (blocks.length === 0) {
    return (
      <div>
        <h1>{title}</h1>
        <p>スケジュールがありません</p>
      </div>
    );
  }

  const dayStart = timeToMin(blocks[0]!.start);
  const dayEnd = timeToMin(blocks[blocks.length - 1]!.end);
  const totalHeight = (dayEnd - dayStart) * PX_PER_MIN;

  // Current task label
  const currentTask = (() => {
    const current = blocks.find(
      s => nowMin >= timeToMin(s.start) && nowMin < timeToMin(s.end),
    );
    if (current) return current.task;
    if (nowMin < dayStart) return '勤務開始前';
    if (nowMin >= dayEnd) return 'お疲れさまでした';
    return 'スロット間';
  })();

  // Hour markers
  const firstHour = Math.ceil(dayStart / 60);
  const lastHour = Math.floor(dayEnd / 60);
  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);

  return (
    <>
      <div className="header-row">
        <h1>{title}</h1>
        <button className="pip-btn" ref={pipBtnRef} title="Picture-in-Picture">
          PiP
        </button>
      </div>

      <div className="clock">
        {useSimulated ? 'SIM ' : ''}現在 {pad(Math.floor(nowMin / 60))}:
        {pad(nowMin % 60)} — {currentTask}
      </div>

      <div className="legend">
        <LegendItem color="#2d2b55" label="他人影響" />
        <LegendItem color="#1e3a2f" label="思考系" />
        <LegendItem color="#1e2d4a" label="作業系" />
        <LegendItem color="#3a1e1e" label="MTG" />
      </div>

      <div
        className="timeline"
        style={{ height: totalHeight, position: 'relative' }}
      >
        {hours.map(h => (
          <div
            key={`hour-${h}`}
            className="hour-line"
            style={{ top: (h * 60 - dayStart) * PX_PER_MIN }}
          >
            <span className="hour-label">{h}:00</span>
          </div>
        ))}

        {blocks.map((item, i) => (
          <Block key={i} item={item} dayStart={dayStart} nowMin={nowMin} />
        ))}

        {nowMin >= dayStart && nowMin <= dayEnd && (
          <div
            className="now-line"
            style={{ top: (nowMin - dayStart) * PX_PER_MIN }}
          />
        )}
      </div>

      {debug && (
        <div className="debug-bar">
          <label>シミュレート:</label>
          <input
            type="range"
            min={0}
            max={1440}
            step={1}
            value={sliderValue}
            onChange={e => {
              setSliderValue(Number(e.target.value));
              setUseSimulated(true);
            }}
          />
          <span className="debug-time">
            {pad(Math.floor(sliderValue / 60))}:{pad(sliderValue % 60)}
          </span>
          <button
            className={useSimulated ? '' : 'active'}
            onClick={() => setUseSimulated(v => !v)}
          >
            {useSimulated ? 'リアルタイム' : 'リアルタイム中'}
          </button>
        </div>
      )}
    </>
  );
}

function Block({
  item,
  dayStart,
  nowMin,
}: {
  item: ScheduleBlock;
  dayStart: number;
  nowMin: number;
}) {
  const startMin = timeToMin(item.start);
  const endMin = timeToMin(item.end);
  const dur = endMin - startMin;
  const top = (startMin - dayStart) * PX_PER_MIN;
  const height = dur * PX_PER_MIN;

  const isCurrent = nowMin >= startMin && nowMin < endMin;
  const isPast = nowMin >= endMin;
  const isCompleted = item.status === 'completed';

  const classes = [
    'block',
    isCurrent && 'current',
    isPast && 'past',
    isCompleted && 'completed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-kind={item.kind} style={{ top, height }}>
      <span className="time-label">
        {item.start}-{item.end}
      </span>
      <span className="task-name">{item.task}</span>
      {item.kind !== '-' && <span className="kind-badge">{item.kind}</span>}
      <span className="duration">{dur}m</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <div className="legend-dot" style={{ background: color }} />
      {label}
    </div>
  );
}
