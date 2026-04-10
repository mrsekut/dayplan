import { useEffect, useState, useCallback, useRef } from 'react';
import type { ScheduleData, ScheduleBlock } from './types';
import { timeToMin, pad, PX_PER_MIN } from './utils';
import { setupPip } from './pip';
import * as api from './api';

type Props = { date: string };

export function ServeApp({ date }: Props) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const pipBtnRef = useRef<HTMLButtonElement>(null);
  const pipSetupDone = useRef(false);
  const dataRef = useRef<ScheduleData | null>(null);
  dataRef.current = data;
  const actionsRef = useRef<{
    complete: (task: string) => Promise<void>;
    skip: (task: string) => Promise<void>;
  }>({ complete: async () => {}, skip: async () => {} });

  const reload = useCallback(async () => {
    try {
      const d = await api.fetchSchedule(date);
      setData(d);
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Tick every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // PiP setup
  useEffect(() => {
    if (data && pipBtnRef.current && !pipSetupDone.current) {
      setupPip(
        pipBtnRef.current,
        () => dataRef.current?.blocks ?? [],
        async (action, task) => {
          if (action === 'complete') await actionsRef.current.complete(task);
          else if (action === 'skip') await actionsRef.current.skip(task);
        },
      );
      pipSetupDone.current = true;
    }
  }, [data]);

  const handleSwap = useCallback(
    async (indexA: number, indexB: number) => {
      try {
        const d = await api.swapBlocks(date, indexA, indexB);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleComplete = useCallback(
    async (task: string) => {
      try {
        const d = await api.completeTask(date, task);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleAddSubtask = useCallback(
    async (task: string, title: string) => {
      try {
        const d = await api.addSubtask(date, task, title);
        setData(d);
        setNewSubtaskText('');
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleToggleSubtask = useCallback(
    async (task: string, index: number) => {
      try {
        const d = await api.toggleSubtask(date, task, index);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleRemoveSubtask = useCallback(
    async (task: string, index: number) => {
      try {
        const d = await api.removeSubtask(date, task, index);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleSkip = useCallback(
    async (task: string) => {
      try {
        const d = await api.skipTask(date, task);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  actionsRef.current = { complete: handleComplete, skip: handleSkip };

  const handleUpdateTime = useCallback(
    async (task: string, start: string, end: string) => {
      try {
        const d = await api.updateBlockTime(date, task, start, end);
        setData(d);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const handleCarry = useCallback(
    async (task: string) => {
      try {
        const result = await api.carryOver(date, [task]);
        setData(result.from);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [date],
  );

  const [debug] = useState(() =>
    new URLSearchParams(window.location.search).has('debug'),
  );
  const [sliderValue, setSliderValue] = useState(780);
  const [useSimulated, setUseSimulated] = useState(debug);

  if (!data) {
    return <div className="loading">{error ?? '読み込み中...'}</div>;
  }

  const { blocks } = data;

  const now = new Date();
  const realNowMin = now.getHours() * 60 + now.getMinutes();
  const nowMin = useSimulated ? sliderValue : realNowMin;

  if (blocks.length === 0) {
    return (
      <div>
        <h1>{date} スケジュール</h1>
        <p>スケジュールがありません</p>
      </div>
    );
  }

  const dayStart = timeToMin(blocks[0]!.start);
  const dayEnd = timeToMin(blocks[blocks.length - 1]!.end);
  const totalHeight = (dayEnd - dayStart) * PX_PER_MIN;

  const currentTask = (() => {
    const current = blocks.find(
      s => nowMin >= timeToMin(s.start) && nowMin < timeToMin(s.end),
    );
    if (current) return current.task;
    if (nowMin < dayStart) return '勤務開始前';
    if (nowMin >= dayEnd) return 'お疲れさまでした';
    return 'スロット間';
  })();

  const firstHour = Math.ceil(dayStart / 60);
  const lastHour = Math.floor(dayEnd / 60);
  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);

  return (
    <>
      <div className="header-row">
        <h1>{date} スケジュール</h1>
        <button className="pip-btn" ref={pipBtnRef} title="Picture-in-Picture">
          PiP
        </button>
      </div>

      <div className="clock">
        現在 {pad(Math.floor(nowMin / 60))}:{pad(nowMin % 60)} — {currentTask}
      </div>

      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <div className="legend">
        <LegendItem color="#1e2d4a" label="focus" />
        <LegendItem color="#1e3a2f" label="batch" />
        <LegendItem color="#3a1e1e" label="mtg" />
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
          <InteractiveBlock
            key={`${item.task}-${i}`}
            item={item}
            index={i}
            total={blocks.length}
            dayStart={dayStart}
            nowMin={nowMin}
            isExpanded={expandedTask === item.task}
            onToggleExpand={() =>
              setExpandedTask(expandedTask === item.task ? null : item.task)
            }
            onSwapUp={() => handleSwap(i, i - 1)}
            onSwapDown={() => handleSwap(i, i + 1)}
            onComplete={() => handleComplete(item.task)}
            onSkip={() => handleSkip(item.task)}
            onCarry={() => handleCarry(item.task)}
            onUpdateTime={(start: string, end: string) =>
              handleUpdateTime(item.task, start, end)
            }
            onAddSubtask={(title: string) => handleAddSubtask(item.task, title)}
            onToggleSubtask={(idx: number) =>
              handleToggleSubtask(item.task, idx)
            }
            onRemoveSubtask={(idx: number) =>
              handleRemoveSubtask(item.task, idx)
            }
            newSubtaskText={expandedTask === item.task ? newSubtaskText : ''}
            onNewSubtaskTextChange={setNewSubtaskText}
          />
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

function InteractiveBlock({
  item,
  index,
  total,
  dayStart,
  nowMin,
  isExpanded,
  onToggleExpand,
  onSwapUp,
  onSwapDown,
  onComplete,
  onSkip,
  onCarry,
  onUpdateTime,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  newSubtaskText,
  onNewSubtaskTextChange,
}: {
  item: ScheduleBlock;
  index: number;
  total: number;
  dayStart: number;
  nowMin: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSwapUp: () => void;
  onSwapDown: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onCarry: () => void;
  onUpdateTime: (start: string, end: string) => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (idx: number) => void;
  onRemoveSubtask: (idx: number) => void;
  newSubtaskText: string;
  onNewSubtaskTextChange: (text: string) => void;
}) {
  const startMin = timeToMin(item.start);
  const endMin = timeToMin(item.end);
  const dur = endMin - startMin;
  const top = (startMin - dayStart) * PX_PER_MIN;
  const height = dur * PX_PER_MIN;

  const isCurrent = nowMin >= startMin && nowMin < endMin;
  const isPast = nowMin >= endMin;
  const isActive = item.status === 'active';
  const isCompleted = item.status === 'completed';
  const isSkipped = item.status === 'skipped';

  const classes = [
    'block',
    'interactive',
    isCurrent && 'current',
    isPast && 'past',
    isActive && 'active',
    isCompleted && 'completed',
    isSkipped && 'skipped',
    isExpanded && 'expanded',
  ]
    .filter(Boolean)
    .join(' ');

  const subtasks = item.subtasks ?? [];

  const [editingTime, setEditingTime] = useState(false);
  const [editStart, setEditStart] = useState(item.start);
  const [editEnd, setEditEnd] = useState(item.end);

  const commitTime = () => {
    if (editStart !== item.start || editEnd !== item.end) {
      onUpdateTime(editStart, editEnd);
    }
    setEditingTime(false);
  };

  const cancelTime = () => {
    setEditStart(item.start);
    setEditEnd(item.end);
    setEditingTime(false);
  };

  return (
    <div
      className={classes}
      data-kind={item.kind}
      style={{
        top,
        height: isExpanded ? 'auto' : height,
        minHeight: height,
        zIndex: isExpanded ? 20 : undefined,
      }}
    >
      <div className="block-main" onClick={onToggleExpand}>
        {editingTime ? (
          <span
            className="time-edit"
            onClick={e => e.stopPropagation()}
          >
            <input
              type="time"
              value={editStart}
              onChange={e => setEditStart(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTime();
                if (e.key === 'Escape') cancelTime();
              }}
              autoFocus
            />
            <span>-</span>
            <input
              type="time"
              value={editEnd}
              onChange={e => setEditEnd(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTime();
                if (e.key === 'Escape') cancelTime();
              }}
              onBlur={commitTime}
            />
          </span>
        ) : (
          <span
            className="time-label"
            onClick={e => {
              e.stopPropagation();
              setEditStart(item.start);
              setEditEnd(item.end);
              setEditingTime(true);
            }}
            title="クリックで時刻編集"
          >
            {item.start}-{item.end}
          </span>
        )}
        <span className="task-name">{item.task}</span>
        <span className="kind-badge">{item.kind}</span>
        <span className="duration">{dur}m</span>
      </div>

      <div className="block-actions">
        <button
          className="action-btn"
          onClick={e => {
            e.stopPropagation();
            onSwapUp();
          }}
          disabled={index === 0}
          title="上に移動"
        >
          ↑
        </button>
        <button
          className="action-btn"
          onClick={e => {
            e.stopPropagation();
            onSwapDown();
          }}
          disabled={index === total - 1}
          title="下に移動"
        >
          ↓
        </button>
        {!isCompleted && !isSkipped && (
          <button
            className="action-btn complete-btn"
            onClick={e => {
              e.stopPropagation();
              onComplete();
            }}
            title="完了"
          >
            ✓
          </button>
        )}
        {!isCompleted && !isSkipped && (
          <button
            className="action-btn skip-btn"
            onClick={e => {
              e.stopPropagation();
              onSkip();
            }}
            title="スキップ"
          >
            ⏭
          </button>
        )}
        {!isCompleted && !isSkipped && (
          <button
            className="action-btn carry-btn"
            onClick={e => {
              e.stopPropagation();
              onCarry();
            }}
            title="明日に繰り越し"
          >
            →明日
          </button>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="subtask-panel" onClick={e => e.stopPropagation()}>
          <div className="subtask-list">
            {subtasks.map((st, i) => (
              <div key={i} className={`subtask-item ${st.done ? 'done' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={st.done}
                    onChange={() => onToggleSubtask(i)}
                  />
                  <span>{st.title}</span>
                </label>
                <button
                  className="subtask-remove"
                  onClick={() => onRemoveSubtask(i)}
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="subtask-panel" onClick={e => e.stopPropagation()}>
          <form
            className="subtask-add"
            onSubmit={e => {
              e.preventDefault();
              if (newSubtaskText.trim()) {
                onAddSubtask(newSubtaskText.trim());
              }
            }}
          >
            <input
              type="text"
              placeholder="サブタスクを追加..."
              value={newSubtaskText}
              onChange={e => onNewSubtaskTextChange(e.target.value)}
              autoFocus
            />
            <button type="submit">+</button>
          </form>
        </div>
      )}
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
