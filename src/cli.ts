import {
  type FixedBlock,
  type DayPlan,
  parseTime,
  todayStr,
  genId,
} from './schedule';
import { buildDayPlan, distributeTasks } from './planner';
import { savePlan, loadPlan } from './storage';

const args = process.argv.slice(2);
const command = args[0] ?? 'help';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  const reader = Bun.stdin.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function printPlan(plan: DayPlan) {
  console.log(`\n📅 ${plan.date}`);
  console.log('─'.repeat(56));

  for (const entry of plan.entries) {
    if (entry.type === 'fixed') {
      const icon = entry.kind === 'mtg' ? '🗣️' : '📌';
      console.log(`  ${icon}  ${entry.start}-${entry.end}  ${entry.title}`);
    } else {
      const duration = parseTime(entry.end) - parseTime(entry.start);
      console.log(`  📂  ${entry.start}-${entry.end}  作業枠 (${duration}分)`);
      if (entry.queue.length > 0) {
        for (const task of entry.queue) {
          const statusIcon =
            task.status === 'active'
              ? '▶'
              : task.status === 'completed'
                ? '✓'
                : task.status === 'skipped'
                  ? '✗'
                  : '·';
          console.log(
            `       ${statusIcon} ${task.title} (${task.estimatedMinutes}m) [${task.kind}]`,
          );
        }
      }
    }
  }
  console.log();
}

function printHelp() {
  console.log(`dayplan v2 — Block + Queue Hybrid

使い方:
  dayplan set              スケジュールをstdinのJSONから設定
  dayplan show [date]      スケジュール表示
  dayplan help             このヘルプを表示

入力フォーマット (set):
  {
    "date": "2026-04-10",
    "fixedBlocks": [
      { "start": "11:30", "end": "12:00", "title": "1on1", "kind": "mtg" }
    ]
  }`);
}

async function main() {
  switch (command) {
    case 'set': {
      const input = await readStdin();
      const data = JSON.parse(input);
      const date = data.date ?? todayStr();
      const fixedBlocks: FixedBlock[] = (data.fixedBlocks ?? []).map(
        (b: any) => ({
          id: b.id ?? genId(),
          type: 'fixed' as const,
          start: b.start,
          end: b.end,
          title: b.title,
          kind: b.kind ?? 'mtg',
        }),
      );
      let plan = buildDayPlan(date, fixedBlocks);
      const tasks = (data.tasks ?? []).map((t: any) => ({
        title: t.title,
        estimatedMinutes: t.estimatedMinutes ?? 30,
        kind: t.kind ?? 'other',
        beadId: t.beadId,
      }));
      if (tasks.length > 0) {
        plan = distributeTasks(plan, tasks);
      }
      savePlan(plan);
      console.log(`✅ ${date} のスケジュールを設定しました`);
      printPlan(plan);
      break;
    }

    case 'show': {
      const date = args[1] ?? todayStr();
      const plan = loadPlan(date);
      if (!plan) {
        console.log(`${date} のスケジュールがありません`);
        process.exit(1);
      }
      printPlan(plan);
      break;
    }

    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
