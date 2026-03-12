import { describe, expect, test } from 'bun:test';
import {
  calcNotifyPoints,
  generateNotifyScript,
  generatePlist,
} from '../../src/core/notify';
import type { Schedule } from '../../src/core/schedule';

const sample: Schedule = {
  date: '2026-03-12',
  blocks: [
    {
      start: '09:30',
      end: '10:00',
      task: 'PRレビュー',
      kind: '他人影響',
      status: 'pending',
    },
    {
      start: '10:00',
      end: '10:30',
      task: '設計',
      kind: '思考系',
      status: 'pending',
    },
    {
      start: '10:30',
      end: '11:00',
      task: '実装',
      kind: '作業系',
      status: 'pending',
    },
    {
      start: '11:00',
      end: '11:30',
      task: '休憩',
      kind: '-',
      status: 'pending',
    },
  ],
};

describe('calcNotifyPoints', () => {
  test('generates notify points 5 min before end', () => {
    const points = calcNotifyPoints(sample, '08:00');
    expect(points).toHaveLength(3); // 休憩(kind "-")はスキップ
    expect(points[0]!.time).toBe('09:55');
    expect(points[1]!.time).toBe('10:25');
    expect(points[2]!.time).toBe('10:55');
  });

  test('skips past notifications', () => {
    const points = calcNotifyPoints(sample, '10:00');
    expect(points).toHaveLength(2); // 09:55 is past
    expect(points[0]!.time).toBe('10:25');
  });

  test('includes next task in message', () => {
    const points = calcNotifyPoints(sample, '08:00');
    expect(points[0]!.message).toContain('PRレビュー');
    expect(points[0]!.message).toContain('次: 設計');
  });

  test('last notifiable task shows next even if kind is -', () => {
    const points = calcNotifyPoints(sample, '08:00');
    const last = points[points.length - 1]!;
    expect(last.message).toContain('実装');
    expect(last.message).toContain('次: 休憩');
  });

  test("skips kind '-' blocks from notification targets", () => {
    const points = calcNotifyPoints(sample, '08:00');
    // 休憩 block itself should not generate a notification
    expect(points.every(p => !p.message.startsWith('「休憩」'))).toBe(true);
  });

  test('returns empty when all past', () => {
    const points = calcNotifyPoints(sample, '12:00');
    expect(points).toHaveLength(0);
  });
});

describe('generateNotifyScript', () => {
  test('generates bash script', () => {
    const points = calcNotifyPoints(sample, '08:00');
    const script = generateNotifyScript(points);
    expect(script).toStartWith('#!/bin/bash');
    expect(script).toContain('osascript');
    expect(script).toContain('display notification');
    expect(script).toContain('wait');
  });

  test('handles empty points', () => {
    const script = generateNotifyScript([]);
    expect(script).toContain('#!/bin/bash');
    expect(script).toContain('wait');
  });
});

describe('generatePlist', () => {
  test('generates valid plist XML', () => {
    const plist = generatePlist('/tmp/dayplan-notify.sh');
    expect(plist).toContain('com.dayplan.notify');
    expect(plist).toContain('/tmp/dayplan-notify.sh');
    expect(plist).toContain('<true/>');
  });
});
