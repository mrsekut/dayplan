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
