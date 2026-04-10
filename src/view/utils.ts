export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export const PX_PER_MIN = 5.5;

export const KIND_COLORS: Record<string, { bg: string; fg: string }> = {
  focus: { bg: '#1e2d4a', fg: '#7eb3e0' },
  batch: { bg: '#1e3a2f', fg: '#7ecba1' },
  mtg: { bg: '#3a1e1e', fg: '#e0a07e' },
  other: { bg: '#1a1a1a', fg: '#666' },
};
