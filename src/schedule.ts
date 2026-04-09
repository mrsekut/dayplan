import { nanoid } from 'nanoid';

// ---- Data Model ----

export type TaskKind = 'focus' | 'batch' | 'mtg' | 'other';

export type FixedBlock = {
  id: string;
  type: 'fixed';
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  title: string;
  kind: TaskKind;
};

export type Task = {
  id: string;
  title: string;
  estimatedMinutes: number;
  kind: TaskKind;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  beadId?: string;
};

export type WorkSlot = {
  id: string;
  type: 'work';
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  queue: Task[];
};

export type Entry = FixedBlock | WorkSlot;

export type DayPlan = {
  date: string; // "YYYY-MM-DD"
  entries: Entry[];
};

// ---- Time Utilities ----

export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- ID Generation ----

export function genId(): string {
  return nanoid(8);
}

// ---- Query ----

export function getCurrentEntry(plan: DayPlan, now = nowMinutes()): Entry | null {
  return (
    plan.entries.find(
      (e) => parseTime(e.start) <= now && now < parseTime(e.end),
    ) ?? null
  );
}

export function getCurrentWorkSlot(plan: DayPlan, now = nowMinutes()): WorkSlot | null {
  const entry = getCurrentEntry(plan, now);
  return entry?.type === 'work' ? entry : null;
}

export function getActiveTask(slot: WorkSlot): Task | null {
  return slot.queue.find((t) => t.status === 'active') ?? null;
}

export function getNextFixedBlock(plan: DayPlan, now = nowMinutes()): FixedBlock | null {
  return (
    plan.entries.find(
      (e): e is FixedBlock => e.type === 'fixed' && parseTime(e.start) > now,
    ) ?? null
  );
}

export function remainingSlotMinutes(plan: DayPlan, now = nowMinutes()): number | null {
  const slot = getCurrentWorkSlot(plan, now);
  if (!slot) return null;
  return parseTime(slot.end) - now;
}

// ---- Mutations ----

export function activateNextTask(slot: WorkSlot): Task | null {
  if (slot.queue.some((t) => t.status === 'active')) return null;
  const next = slot.queue.find((t) => t.status === 'pending');
  if (!next) return null;
  next.status = 'active';
  return next;
}

export function completeCurrentTask(
  plan: DayPlan,
  now = nowMinutes(),
): { completed: Task | null; next: Task | null } {
  const slot = getCurrentWorkSlot(plan, now);
  if (!slot) return { completed: null, next: null };

  const active = slot.queue.find((t) => t.status === 'active');
  if (!active) return { completed: null, next: null };

  active.status = 'completed';
  const next = activateNextTask(slot);
  return { completed: active, next };
}
