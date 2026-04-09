import { useState, useEffect, useCallback, useRef } from 'react';
import { setupPip } from './pip';
import './styles.css';

type Task = {
  id: string;
  title: string;
  estimatedMinutes: number;
  kind: string;
  status: string;
  beadId?: string;
};

type FixedBlock = {
  type: 'fixed';
  start: string;
  end: string;
  title: string;
  kind: string;
};

type WorkSlot = {
  type: 'work';
  start: string;
  end: string;
  queue: Task[];
};

type Entry = FixedBlock | WorkSlot;
type DayPlan = { date: string; entries: Entry[] };

const PX_PER_MIN = 4.5;
const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}

function minToPos(m: number): number {
  return (m - DAY_START) * PX_PER_MIN;
}

async function doApi(action: string): Promise<void> {
  await fetch('/api/' + action, { method: 'POST' });
}

export function App() {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [_now, setNow] = useState(Date.now());
  const planRef = useRef<DayPlan | null>(null);
  const pipSetupDone = useRef(false);
  const pipBtnRef = useRef<HTMLButtonElement>(null);

  const reload = useCallback(async () => {
    const date = new URL(window.location.href).searchParams.get('date') ?? '';
    const r = await fetch('/api/plan/' + date);
    if (r.ok) {
      const p: DayPlan = await r.json();
      setPlan(p);
      planRef.current = p;
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  // PiP setup
  useEffect(() => {
    if (plan && pipBtnRef.current && !pipSetupDone.current) {
      setupPip(pipBtnRef.current, () => planRef.current, async (action: string) => {
        await doApi(action);
        await reload();
      });
      pipSetupDone.current = true;
    }
  }, [plan, reload]);

  const handleAction = useCallback(async (action: string) => {
    await doApi(action);
    await reload();
  }, [reload]);

  if (!plan) return <div className="container">Loading...</div>;

  const d = new Date();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const totalHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  const hours: number[] = [];
  for (let hr = Math.floor(DAY_START / 60); hr <= Math.floor(DAY_END / 60); hr++) {
    hours.push(hr);
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📅 {plan.date}</h1>
        <button ref={pipBtnRef} className="pip-btn">📌 PiP</button>
      </div>
      <div className="timeline" style={{ height: totalHeight, position: 'relative' }}>
        {hours.map(hr => (
          <div key={'h' + hr}>
            <span className="hour-label" style={{ top: minToPos(hr * 60) }}>
              {String(hr).padStart(2, '0')}:00
            </span>
            <div className="hour-line" style={{ top: minToPos(hr * 60) }} />
          </div>
        ))}

        {plan.entries.map((entry, i) => {
          const top = minToPos(timeToMin(entry.start));
          const height = (timeToMin(entry.end) - timeToMin(entry.start)) * PX_PER_MIN;

          if (entry.type === 'fixed') {
            return (
              <div key={'e' + i} className="entry entry-fixed" style={{ top, height: Math.max(height - 2, 20) }}>
                <div className="entry-title">
                  {entry.kind === 'mtg' ? '🗣️ ' : '📌 '}{entry.title}
                </div>
              </div>
            );
          }

          return (
            <div key={'e' + i} className="entry entry-work" style={{ top, height: Math.max(height - 2, 20) }}>
              {entry.queue.map((task, j) => (
                <div key={'t' + j} className={`task-item ${task.status}`}>
                  <span className="task-status">
                    {task.status === 'active' ? '▶' : task.status === 'completed' ? '✓' : task.status === 'skipped' ? '✗' : '·'}
                  </span>
                  <span className="task-title">{task.title}</span>
                  <span className="task-time">({task.estimatedMinutes}m)</span>
                  <span className={`task-kind kind-${task.kind}`}>{task.kind}</span>
                  {task.status === 'active' && (
                    <span className="task-actions">
                      <button className="action-btn complete-btn" onClick={() => handleAction('complete')}>✓</button>
                      <button className="action-btn skip-btn" onClick={() => handleAction('skip')}>⏭</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {nowMin >= DAY_START && nowMin <= DAY_END && (
          <div className="now-line" style={{ top: minToPos(nowMin) }}>
            <div className="now-dot" />
          </div>
        )}
      </div>
    </div>
  );
}
