import { describe, expect, test } from 'bun:test';
import {
  addBlock,
  completeBlock,
  getCurrentBlock,
  parseSchedule,
  removeBlock,
  type Schedule,
  type TimeBlock,
} from '../../src/core/schedule';

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
      status: 'pending',
    },
    {
      start: '10:30',
      end: '11:00',
      task: '実装',
      kind: 'batch',
      status: 'completed',
    },
  ],
};

describe('parseSchedule', () => {
  test('valid JSON', () => {
    const json = JSON.stringify(sample);
    const result = parseSchedule(json);
    expect(result.date).toBe('2026-03-12');
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0]!.task).toBe('PRレビュー');
  });

  test('defaults kind to - and status to pending', () => {
    const json = JSON.stringify({
      date: '2026-03-12',
      blocks: [{ start: '09:00', end: '09:30', task: 'test' }],
    });
    const result = parseSchedule(json);
    expect(result.blocks[0]!.kind).toBe('other');
    expect(result.blocks[0]!.status).toBe('pending');
  });

  test('rejects invalid JSON', () => {
    expect(() => parseSchedule('not json')).toThrow('Invalid JSON');
  });

  test('rejects invalid date', () => {
    expect(() => parseSchedule('{"date":"bad","blocks":[]}')).toThrow(
      'Invalid date',
    );
  });

  test('rejects invalid time', () => {
    const json = JSON.stringify({
      date: '2026-03-12',
      blocks: [{ start: '9:00', end: '09:30', task: 'x' }],
    });
    expect(() => parseSchedule(json)).toThrow('Invalid blocks[0].start');
  });

  test('rejects invalid kind', () => {
    const json = JSON.stringify({
      date: '2026-03-12',
      blocks: [{ start: '09:00', end: '09:30', task: 'x', kind: 'invalid' }],
    });
    expect(() => parseSchedule(json)).toThrow('is not valid');
  });
});

describe('addBlock', () => {
  test('adds and sorts by start time', () => {
    const block: TimeBlock = {
      start: '09:45',
      end: '10:00',
      task: '割り込み',
      kind: 'other',
      status: 'pending',
    };
    const result = addBlock(sample, block);
    expect(result.blocks).toHaveLength(4);
    expect(result.blocks[1]!.task).toBe('割り込み');
  });
});

describe('removeBlock', () => {
  test('removes by task name', () => {
    const result = removeBlock(sample, '設計');
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.find(b => b.task === '設計')).toBeUndefined();
  });

  test('throws if not found', () => {
    expect(() => removeBlock(sample, '存在しない')).toThrow('Task not found');
  });
});

describe('completeBlock', () => {
  test('marks as completed', () => {
    const result = completeBlock(sample, 'PRレビュー');
    expect(result.blocks[0]!.status).toBe('completed');
  });

  test('throws if not found', () => {
    expect(() => completeBlock(sample, '存在しない')).toThrow('Task not found');
  });
});

describe('getCurrentBlock', () => {
  test('returns current block', () => {
    const block = getCurrentBlock(sample, '10:15');
    expect(block?.task).toBe('設計');
  });

  test('returns null outside any block', () => {
    expect(getCurrentBlock(sample, '08:00')).toBeNull();
    expect(getCurrentBlock(sample, '12:00')).toBeNull();
  });

  test('start inclusive, end exclusive', () => {
    expect(getCurrentBlock(sample, '09:30')?.task).toBe('PRレビュー');
    expect(getCurrentBlock(sample, '10:00')?.task).toBe('設計');
  });
});
