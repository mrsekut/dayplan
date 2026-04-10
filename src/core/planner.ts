import { timeToMin, type Schedule, type TimeBlock, type TaskKind } from './schedule';

export type FixedBlock = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  title: string;
  kind: TaskKind;
};

export type TaskInput = {
  title: string;
  estimatedMinutes: number;
  kind: TaskKind;
  beadId?: string;
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 固定ブロックとタスク一覧からScheduleを構築する。
 * 固定ブロックはそのまま配置し、タスクは空き時間に順番にstart/endを割り当てる。
 */
export function buildSchedule(
  date: string,
  fixedBlocks: FixedBlock[],
  tasks: TaskInput[],
  dayStart = '09:00',
  dayEnd = '18:00',
): Schedule {
  // 固定ブロックをTimeBlockに変換して時間順にソート
  const fixed: TimeBlock[] = fixedBlocks
    .map(fb => ({
      start: fb.start,
      end: fb.end,
      task: fb.title,
      kind: fb.kind,
      status: 'pending' as const,
    }))
    .sort((a, b) => timeToMin(a.start) - timeToMin(b.start));

  // 空き時間スロットを計算
  const gaps: { start: number; end: number }[] = [];
  let cursor = timeToMin(dayStart);
  for (const fb of fixed) {
    const fbStart = timeToMin(fb.start);
    if (cursor < fbStart) {
      gaps.push({ start: cursor, end: fbStart });
    }
    cursor = Math.max(cursor, timeToMin(fb.end));
  }
  const dayEndMin = timeToMin(dayEnd);
  if (cursor < dayEndMin) {
    gaps.push({ start: cursor, end: dayEndMin });
  }

  // タスクを空き時間に順番に配置
  const taskBlocks: TimeBlock[] = [];
  let gapIdx = 0;
  let gapCursor = gaps.length > 0 ? gaps[0]!.start : 0;

  for (const task of tasks) {
    if (gapIdx >= gaps.length) break;

    // 現在のgapに入らなければ次のgapへ
    const gap = gaps[gapIdx]!;
    const remaining = gap.end - gapCursor;
    if (remaining <= 0 && gapIdx < gaps.length - 1) {
      gapIdx++;
      gapCursor = gaps[gapIdx]!.start;
    }

    const start = gapCursor;
    const end = Math.min(start + task.estimatedMinutes, gaps[gapIdx]!.end);

    taskBlocks.push({
      start: formatTime(start),
      end: formatTime(end),
      task: task.title,
      kind: task.kind,
      status: 'pending',
      ...(task.beadId ? { beadId: task.beadId } : {}),
    });

    gapCursor = end;

    // gap使い切ったら次へ
    if (gapCursor >= gaps[gapIdx]!.end && gapIdx < gaps.length - 1) {
      gapIdx++;
      gapCursor = gaps[gapIdx]!.start;
    }
  }

  const blocks = [...fixed, ...taskBlocks].sort(
    (a, b) => timeToMin(a.start) - timeToMin(b.start),
  );

  return { date, blocks };
}
