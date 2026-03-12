import { describe, expect, test } from 'bun:test';
import { renderHtml } from '../../src/core/render';
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
      status: 'completed',
    },
    {
      start: '10:30',
      end: '11:00',
      task: '実装',
      kind: '作業系',
      status: 'pending',
    },
  ],
};

describe('renderHtml', () => {
  test('returns valid HTML document', () => {
    const html = renderHtml(sample);
    expect(html).toStartWith('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  test('includes schedule date in title', () => {
    const html = renderHtml(sample);
    expect(html).toContain('2026-03-12');
  });

  test('embeds SCHEDULE array with all blocks', () => {
    const html = renderHtml(sample);
    expect(html).toContain('"PRレビュー"');
    expect(html).toContain('"設計"');
    expect(html).toContain('"実装"');
  });

  test('includes status field in SCHEDULE', () => {
    const html = renderHtml(sample);
    expect(html).toContain('"completed"');
    expect(html).toContain('"pending"');
  });

  test('includes kind-based CSS', () => {
    const html = renderHtml(sample);
    expect(html).toContain('[data-kind="他人影響"]');
    expect(html).toContain('[data-kind="思考系"]');
    expect(html).toContain('[data-kind="作業系"]');
    expect(html).toContain('[data-kind="MTG"]');
  });

  test('includes debug mode support', () => {
    const html = renderHtml(sample);
    expect(html).toContain('debugBar');
    expect(html).toContain('timeSlider');
  });

  test('includes now-line and current block logic', () => {
    const html = renderHtml(sample);
    expect(html).toContain('now-line');
    expect(html).toContain('classList.add("current")');
  });

  test('handles empty schedule', () => {
    const empty: Schedule = { date: '2026-03-12', blocks: [] };
    const html = renderHtml(empty);
    expect(html).toContain('SCHEDULE = []');
  });
});
