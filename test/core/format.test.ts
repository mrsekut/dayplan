import { describe, expect, test } from 'bun:test';
import { formatSchedule, formatStatus } from '../../src/core/format';
import type { Schedule } from '../../src/core/schedule';

const sample: Schedule = {
  date: '2026-03-12',
  blocks: [
    {
      start: '09:30',
      end: '10:00',
      task: 'PRレビュー',
      kind: 'focus',
      status: 'pending',
    },
    {
      start: '10:00',
      end: '10:30',
      task: '設計',
      kind: 'focus',
      status: 'completed',
    },
    {
      start: '10:30',
      end: '11:00',
      task: '実装',
      kind: 'batch',
      status: 'pending',
    },
  ],
};

describe('formatSchedule', () => {
  test('includes date', () => {
    const output = formatSchedule(sample);
    expect(output).toContain('2026-03-12');
  });

  test('includes all tasks', () => {
    const output = formatSchedule(sample);
    expect(output).toContain('PRレビュー');
    expect(output).toContain('設計');
    expect(output).toContain('実装');
  });

  test('includes summary', () => {
    const output = formatSchedule(sample);
    expect(output).toContain('合計: 90m');
    expect(output).toContain('1/3 完了');
  });
});

describe('formatStatus', () => {
  test('shows current task with remaining time', () => {
    const output = formatStatus(sample, '10:15');
    expect(output).toContain('設計');
    expect(output).toContain('残り15分');
  });

  test('shows next task when in gap', () => {
    const output = formatStatus(
      {
        date: '2026-03-12',
        blocks: [
          {
            start: '10:00',
            end: '10:30',
            task: 'A',
            kind: 'other',
            status: 'pending',
          },
          {
            start: '11:00',
            end: '11:30',
            task: 'B',
            kind: 'other',
            status: 'pending',
          },
        ],
      },
      '10:45',
    );
    expect(output).toContain('次: B');
  });

  test('shows done when all tasks finished', () => {
    const output = formatStatus(sample, '12:00');
    expect(output).toContain('全タスク終了');
  });

  test('shows before start message', () => {
    const output = formatStatus(sample, '08:00');
    expect(output).toContain('勤務開始前');
  });
});
