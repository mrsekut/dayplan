import { describe, expect, test } from 'bun:test';
import { buildSchedule } from '../../src/core/planner';

describe('buildSchedule', () => {
  test('places fixed blocks and fills gaps with tasks', () => {
    const result = buildSchedule(
      '2026-04-10',
      [{ start: '11:00', end: '11:30', title: 'MTG', kind: 'mtg' }],
      [
        { title: '設計', estimatedMinutes: 30, kind: 'focus' },
        { title: '実装', estimatedMinutes: 60, kind: 'focus' },
      ],
      '09:00',
      '12:00',
    );
    // 09:00-09:30 設計, 09:30-10:30 実装, 11:00-11:30 MTG
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0]!.task).toBe('設計');
    expect(result.blocks[0]!.start).toBe('09:00');
    expect(result.blocks[0]!.end).toBe('09:30');
    expect(result.blocks[1]!.task).toBe('実装');
    expect(result.blocks[1]!.start).toBe('09:30');
    expect(result.blocks[1]!.end).toBe('10:30');
    expect(result.blocks[2]!.task).toBe('MTG');
  });

  test('overflows tasks to next gap', () => {
    const result = buildSchedule(
      '2026-04-10',
      [{ start: '09:30', end: '10:00', title: 'MTG', kind: 'mtg' }],
      [
        { title: 'A', estimatedMinutes: 30, kind: 'focus' },
        { title: 'B', estimatedMinutes: 30, kind: 'batch' },
      ],
      '09:00',
      '11:00',
    );
    // 09:00-09:30 A, 09:30-10:00 MTG, 10:00-10:30 B
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0]!.task).toBe('A');
    expect(result.blocks[1]!.task).toBe('MTG');
    expect(result.blocks[2]!.task).toBe('B');
    expect(result.blocks[2]!.start).toBe('10:00');
  });

  test('no fixed blocks fills entire day', () => {
    const result = buildSchedule(
      '2026-04-10',
      [],
      [{ title: 'Work', estimatedMinutes: 60, kind: 'focus' }],
      '09:00',
      '18:00',
    );
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]!.start).toBe('09:00');
    expect(result.blocks[0]!.end).toBe('10:00');
  });

  test('preserves beadId', () => {
    const result = buildSchedule(
      '2026-04-10',
      [],
      [{ title: 'A', estimatedMinutes: 30, kind: 'focus', beadId: 'dayplan-abc' }],
      '09:00',
      '18:00',
    );
    expect(result.blocks[0]!.beadId).toBe('dayplan-abc');
  });

  test('unsorted fixed blocks are handled', () => {
    const result = buildSchedule(
      '2026-04-10',
      [
        { start: '14:00', end: '15:00', title: 'Later', kind: 'mtg' },
        { start: '10:00', end: '11:00', title: 'Earlier', kind: 'mtg' },
      ],
      [],
      '09:00',
      '18:00',
    );
    expect(result.blocks[0]!.task).toBe('Earlier');
    expect(result.blocks[1]!.task).toBe('Later');
  });
});
