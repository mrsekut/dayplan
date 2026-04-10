import type { Schedule } from './schedule';
import { timeToMin } from './schedule';

/** Schedule をターミナル表示用のテーブル文字列に変換 */
export function formatSchedule(schedule: Schedule): string {
  const lines: string[] = [];
  lines.push(`📅 ${schedule.date}`);
  lines.push('');
  lines.push(
    padEnd('時間', 14) +
      padEnd('タスク', 36) +
      padEnd('種類', 10) +
      padEnd('状態', 8) +
      '長さ',
  );
  lines.push('─'.repeat(76));

  for (const b of schedule.blocks) {
    const dur = timeToMin(b.end) - timeToMin(b.start);
    const status =
      b.status === 'completed' ? '✓' :
      b.status === 'active' ? '▶' :
      b.status === 'skipped' ? '✗' : ' ';
    lines.push(
      padEnd(`${b.start}-${b.end}`, 14) +
        padEnd(b.task, 36) +
        padEnd(b.kind, 10) +
        padEnd(`[${status}]`, 8) +
        `${dur}m`,
    );
  }

  lines.push('');
  const total = schedule.blocks.reduce(
    (sum, b) => sum + (timeToMin(b.end) - timeToMin(b.start)),
    0,
  );
  const completed = schedule.blocks.filter(
    b => b.status === 'completed',
  ).length;
  lines.push(`合計: ${total}m | ${completed}/${schedule.blocks.length} 完了`);

  return lines.join('\n');
}

/** 現在のタスクと残り時間を表示する文字列を生成 */
export function formatStatus(schedule: Schedule, now: string): string {
  const nowMin = timeToMin(now);
  const current = schedule.blocks.find(
    b => nowMin >= timeToMin(b.start) && nowMin < timeToMin(b.end),
  );

  if (!current) {
    if (schedule.blocks.length === 0) {
      return 'スケジュールなし';
    }
    const first = schedule.blocks[0]!;
    const last = schedule.blocks[schedule.blocks.length - 1]!;
    if (nowMin < timeToMin(first.start)) {
      const until = timeToMin(first.start) - nowMin;
      return `勤務開始前 — 最初: ${first.task} (${first.start}、あと${until}分)`;
    }
    if (nowMin >= timeToMin(last.end)) {
      return '全タスク終了 🎉';
    }
    const next = schedule.blocks.find(b => timeToMin(b.start) > nowMin);
    if (next) {
      const until = timeToMin(next.start) - nowMin;
      return `スロット間 — 次: ${next.task} (${next.start}、あと${until}分)`;
    }
    return 'スロット間';
  }

  const remaining = timeToMin(current.end) - nowMin;
  const lines: string[] = [];
  lines.push(`📍 ${current.task}`);
  lines.push(`   ${current.start}-${current.end} (残り${remaining}分)`);
  lines.push(`   種類: ${current.kind}`);

  const idx = schedule.blocks.indexOf(current);
  const next = schedule.blocks[idx + 1];
  if (next) {
    lines.push(`   次: ${next.task} (${next.start})`);
  }

  return lines.join('\n');
}

/** 全角文字を考慮した padEnd */
function padEnd(str: string, width: number): string {
  const w = [...str].reduce(
    (acc, ch) => acc + (ch.charCodeAt(0) > 0xff ? 2 : 1),
    0,
  );
  return str + ' '.repeat(Math.max(0, width - w));
}
