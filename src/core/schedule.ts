/** タスクの種類 */
export type TaskKind = '他人影響' | '思考系' | '作業系' | 'MTG' | '-';

/** タスクの状態 */
export type BlockStatus = 'pending' | 'completed';

/** サブタスク */
export type SubTask = {
  title: string;
  done: boolean;
};

/** 1つの時間ブロック */
export type TimeBlock = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  task: string;
  kind: TaskKind;
  status: BlockStatus;
  subtasks?: SubTask[];
};

/** 1日のスケジュール */
export type Schedule = {
  date: string; // "YYYY-MM-DD"
  blocks: TimeBlock[];
};

const VALID_KINDS: TaskKind[] = ['他人影響', '思考系', '作業系', 'MTG', '-'];
const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateTime(t: string, field: string): void {
  if (!TIME_RE.test(t)) {
    throw new Error(`Invalid ${field}: "${t}" (expected HH:MM)`);
  }
}

function validateBlock(block: unknown, index: number): TimeBlock {
  if (typeof block !== 'object' || block === null) {
    throw new Error(`blocks[${index}]: expected object`);
  }
  const b = block as Record<string, unknown>;

  if (typeof b['start'] !== 'string')
    throw new Error(`blocks[${index}].start: required`);
  if (typeof b['end'] !== 'string')
    throw new Error(`blocks[${index}].end: required`);
  if (typeof b['task'] !== 'string')
    throw new Error(`blocks[${index}].task: required`);

  validateTime(b['start'], `blocks[${index}].start`);
  validateTime(b['end'], `blocks[${index}].end`);

  const kind = (b['kind'] ?? '-') as string;
  if (!VALID_KINDS.includes(kind as TaskKind)) {
    throw new Error(
      `blocks[${index}].kind: "${kind}" is not valid (${VALID_KINDS.join(', ')})`,
    );
  }

  const status = (b['status'] ?? 'pending') as string;
  if (status !== 'pending' && status !== 'completed') {
    throw new Error(
      `blocks[${index}].status: "${status}" is not valid (pending, completed)`,
    );
  }

  const subtasks = b['subtasks'];
  let parsedSubtasks: SubTask[] | undefined;
  if (Array.isArray(subtasks)) {
    parsedSubtasks = subtasks.map((s: unknown, j: number) => {
      if (typeof s !== 'object' || s === null)
        throw new Error(`blocks[${index}].subtasks[${j}]: expected object`);
      const st = s as Record<string, unknown>;
      if (typeof st['title'] !== 'string')
        throw new Error(`blocks[${index}].subtasks[${j}].title: required`);
      return {
        title: st['title'],
        done: st['done'] === true,
      };
    });
  }

  return {
    start: b['start'],
    end: b['end'],
    task: b['task'],
    kind: kind as TaskKind,
    status: status as BlockStatus,
    ...(parsedSubtasks ? { subtasks: parsedSubtasks } : {}),
  };
}

/** JSON 文字列をパースして Schedule を返す */
export function parseSchedule(json: string): Schedule {
  const raw = (() => {
    try {
      return JSON.parse(json) as unknown;
    } catch {
      throw new Error('Invalid JSON. Expected: { date, blocks: [...] }');
    }
  })();

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Expected top-level object with { date, blocks }');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['date'] !== 'string' || !DATE_RE.test(obj['date'])) {
    throw new Error(`Invalid date: "${obj['date']}" (expected YYYY-MM-DD)`);
  }

  if (!Array.isArray(obj['blocks'])) {
    throw new Error('blocks: expected array');
  }

  const blocks = obj['blocks'].map((b: unknown, i: number) =>
    validateBlock(b, i),
  );

  return { date: obj['date'] as string, blocks };
}

/** ブロックを追加して時間順にソート */
export function addBlock(schedule: Schedule, block: TimeBlock): Schedule {
  const blocks = [...schedule.blocks, block].sort(
    (a, b) => timeToMin(a.start) - timeToMin(b.start),
  );
  return { ...schedule, blocks };
}

/** 名前でブロックを削除 */
export function removeBlock(schedule: Schedule, taskName: string): Schedule {
  const blocks = schedule.blocks.filter(b => b.task !== taskName);
  if (blocks.length === schedule.blocks.length) {
    throw new Error(`Task not found: "${taskName}"`);
  }
  return { ...schedule, blocks };
}

/** タスクを完了済みにする */
export function completeBlock(schedule: Schedule, taskName: string): Schedule {
  const blocks = schedule.blocks.map(b => {
    if (b.task === taskName) {
      return { ...b, status: 'completed' as const };
    }
    return b;
  });
  if (blocks.every((b, i) => b === schedule.blocks[i])) {
    throw new Error(`Task not found: "${taskName}"`);
  }
  return { ...schedule, blocks };
}

/** 指定時刻に実行中のタスクを返す */
export function getCurrentBlock(
  schedule: Schedule,
  now: string,
): TimeBlock | null {
  const nowMin = timeToMin(now);
  return (
    schedule.blocks.find(
      b => nowMin >= timeToMin(b.start) && nowMin < timeToMin(b.end),
    ) ?? null
  );
}

/** ブロックの順序を入れ替え (時刻を交換) */
export function swapBlocks(
  schedule: Schedule,
  indexA: number,
  indexB: number,
): Schedule {
  const blocks = [...schedule.blocks];
  if (
    indexA < 0 ||
    indexA >= blocks.length ||
    indexB < 0 ||
    indexB >= blocks.length
  ) {
    throw new Error(`Invalid block index: ${indexA}, ${indexB}`);
  }
  const a = blocks[indexA]!;
  const b = blocks[indexB]!;
  // 時刻を保持したままタスク内容を入れ替える
  blocks[indexA] = { ...b, start: a.start, end: a.end };
  blocks[indexB] = { ...a, start: b.start, end: b.end };
  return { ...schedule, blocks };
}

/** サブタスクを追加 */
export function addSubtask(
  schedule: Schedule,
  taskName: string,
  subtaskTitle: string,
): Schedule {
  const blocks = schedule.blocks.map(b => {
    if (b.task !== taskName) return b;
    const subtasks = [
      ...(b.subtasks ?? []),
      { title: subtaskTitle, done: false },
    ];
    return { ...b, subtasks };
  });
  if (blocks.every((b, i) => b === schedule.blocks[i])) {
    throw new Error(`Task not found: "${taskName}"`);
  }
  return { ...schedule, blocks };
}

/** サブタスクの完了状態を切り替え */
export function toggleSubtask(
  schedule: Schedule,
  taskName: string,
  subtaskIndex: number,
): Schedule {
  const blocks = schedule.blocks.map(b => {
    if (b.task !== taskName) return b;
    const subtasks = (b.subtasks ?? []).map((s, i) =>
      i === subtaskIndex ? { ...s, done: !s.done } : s,
    );
    return { ...b, subtasks };
  });
  if (blocks.every((b, i) => b === schedule.blocks[i])) {
    throw new Error(`Task not found: "${taskName}"`);
  }
  return { ...schedule, blocks };
}

/** サブタスクを削除 */
export function removeSubtask(
  schedule: Schedule,
  taskName: string,
  subtaskIndex: number,
): Schedule {
  const blocks = schedule.blocks.map(b => {
    if (b.task !== taskName) return b;
    const filtered = (b.subtasks ?? []).filter((_, i) => i !== subtaskIndex);
    if (filtered.length > 0) {
      return { ...b, subtasks: filtered };
    }
    const { subtasks: _removed, ...rest } = b;
    return rest as TimeBlock;
  });
  if (blocks.every((b, i) => b === schedule.blocks[i])) {
    throw new Error(`Task not found: "${taskName}"`);
  }
  return { ...schedule, blocks };
}

/** ブロックの時刻を変更して時間順にソート */
export function updateBlockTime(
  schedule: Schedule,
  taskName: string,
  start: string,
  end: string,
): Schedule {
  if (!TIME_RE.test(start)) throw new Error(`Invalid start: "${start}"`);
  if (!TIME_RE.test(end)) throw new Error(`Invalid end: "${end}"`);
  if (timeToMin(start) >= timeToMin(end)) {
    throw new Error('start must be before end');
  }
  let found = false;
  const blocks = schedule.blocks.map(b => {
    if (b.task !== taskName) return b;
    found = true;
    return { ...b, start, end };
  });
  if (!found) throw new Error(`Task not found: "${taskName}"`);
  blocks.sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  return { ...schedule, blocks };
}

/** 未完了ブロックを翌日に繰り越し */
export function carryOverBlocks(
  fromSchedule: Schedule,
  toSchedule: Schedule,
  taskNames: string[],
): { from: Schedule; to: Schedule } {
  const toCarry = fromSchedule.blocks.filter(b => taskNames.includes(b.task));
  if (toCarry.length === 0) {
    throw new Error('No matching tasks to carry over');
  }
  const fromBlocks = fromSchedule.blocks.filter(
    b => !taskNames.includes(b.task),
  );
  const newToBlocks = [
    ...toSchedule.blocks,
    ...toCarry.map(b => ({ ...b, status: 'pending' as const })),
  ].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  return {
    from: { ...fromSchedule, blocks: fromBlocks },
    to: { ...toSchedule, blocks: newToBlocks },
  };
}

/** "HH:MM" を分に変換 */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}
