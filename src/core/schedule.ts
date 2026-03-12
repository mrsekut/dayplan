/** タスクの種類 */
export type TaskKind = '他人影響' | '思考系' | '作業系' | 'MTG' | '-';

/** タスクの状態 */
export type BlockStatus = 'pending' | 'completed';

/** 1つの時間ブロック */
export type TimeBlock = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  task: string;
  kind: TaskKind;
  status: BlockStatus;
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

  return {
    start: b['start'],
    end: b['end'],
    task: b['task'],
    kind: kind as TaskKind,
    status: status as BlockStatus,
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

/** "HH:MM" を分に変換 */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}
