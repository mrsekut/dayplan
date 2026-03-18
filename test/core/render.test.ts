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
  test('returns valid HTML document', async () => {
    const html = await renderHtml(sample);
    expect(html).toStartWith('<!doctype html>');
    expect(html).toContain('</html>');
  });

  test('includes schedule date in title', async () => {
    const html = await renderHtml(sample);
    expect(html).toContain('2026-03-12 スケジュール');
  });

  test('embeds __SCHEDULE__ with all blocks', async () => {
    const html = await renderHtml(sample);
    expect(html).toContain('window.__SCHEDULE__=');
    expect(html).toContain('PRレビュー');
    expect(html).toContain('設計');
    expect(html).toContain('実装');
  });

  test('includes status field in schedule data', async () => {
    const html = await renderHtml(sample);
    expect(html).toContain('"completed"');
    expect(html).toContain('"pending"');
  });

  test('is a self-contained single HTML file', async () => {
    const html = await renderHtml(sample);
    // No external script/css references
    expect(html).not.toMatch(/src=["']\.\/chunk/);
    expect(html).not.toMatch(/href=["']\.\/chunk/);
    // Has inline script and style
    expect(html).toContain('<script>');
    expect(html).toContain('<style>');
  });

  test('handles empty schedule', async () => {
    const empty: Schedule = { date: '2026-03-12', blocks: [] };
    const html = await renderHtml(empty);
    expect(html).toContain('window.__SCHEDULE__=');
    expect(html).toContain('"blocks":[]');
  });
});
