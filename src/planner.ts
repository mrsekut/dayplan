import {
  type FixedBlock,
  type Task,
  type TaskKind,
  type WorkSlot,
  type DayPlan,
  type Entry,
  parseTime,
  formatTime,
  genId,
} from './schedule';

function sortByStart(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

export function buildDayPlan(
  date: string,
  fixedBlocks: FixedBlock[],
  dayStart = '09:00',
  dayEnd = '18:00',
): DayPlan {
  const sorted = sortByStart(fixedBlocks) as FixedBlock[];
  const entries: Entry[] = [];
  let cursor = parseTime(dayStart);

  for (const block of sorted) {
    const blockStart = parseTime(block.start);
    if (cursor < blockStart) {
      entries.push({
        id: genId(),
        type: 'work',
        start: formatTime(cursor),
        end: block.start,
        queue: [],
      } satisfies WorkSlot);
    }
    entries.push(block);
    cursor = parseTime(block.end);
  }

  const dayEndMin = parseTime(dayEnd);
  if (cursor < dayEndMin) {
    entries.push({
      id: genId(),
      type: 'work',
      start: formatTime(cursor),
      end: dayEnd,
      queue: [],
    } satisfies WorkSlot);
  }

  return { date, entries: sortByStart(entries) };
}

export type TaskInput = {
  title: string;
  estimatedMinutes: number;
  kind: TaskKind;
  beadId?: string;
};

function slotDuration(slot: WorkSlot): number {
  return parseTime(slot.end) - parseTime(slot.start);
}

function slotUsedMinutes(slot: WorkSlot): number {
  return slot.queue.reduce((sum, t) => sum + t.estimatedMinutes, 0);
}

export function distributeTasks(plan: DayPlan, tasks: TaskInput[]): DayPlan {
  const workSlots = plan.entries.filter(
    (e): e is WorkSlot => e.type === 'work',
  );
  if (workSlots.length === 0) return plan;

  let slotIdx = 0;
  for (const input of tasks) {
    const task: Task = {
      id: genId(),
      title: input.title,
      estimatedMinutes: input.estimatedMinutes,
      kind: input.kind,
      status: 'pending',
      ...(input.beadId ? { beadId: input.beadId } : {}),
    };

    // Move to next slot if current is full and there are more slots
    let current = workSlots[slotIdx]!;
    if (
      slotIdx < workSlots.length - 1 &&
      slotUsedMinutes(current) + task.estimatedMinutes > slotDuration(current)
    ) {
      slotIdx++;
      current = workSlots[slotIdx]!;
    }

    current.queue.push(task);
  }

  return plan;
}
