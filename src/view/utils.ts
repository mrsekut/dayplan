export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export const PX_PER_MIN = 5.5;

export const KIND_COLORS: Record<string, { bg: string; fg: string }> = {
  他人影響: { bg: '#2d2b55', fg: '#a89edb' },
  思考系: { bg: '#1e3a2f', fg: '#7ecba1' },
  作業系: { bg: '#1e2d4a', fg: '#7eb3e0' },
  MTG: { bg: '#3a1e1e', fg: '#e0a07e' },
  '-': { bg: '#1a1a1a', fg: '#666' },
};
