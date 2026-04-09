import {
  type FixedBlock,
  type DayPlan,
  parseTime,
  todayStr,
  genId,
  getCurrentEntry,
  getCurrentWorkSlot,
  getActiveTask,
  getNextFixedBlock,
  remainingSlotMinutes,
  activateNextTask,
  completeCurrentTask,
  skipCurrentTask,
  addTaskToSlot,
  carryOverTasks,
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
  dayplan status           現在のタスクと残り時間を表示
  dayplan complete         現在のタスクを完了にする
  dayplan skip             現在のタスクをスキップ
  dayplan add-task         タスクをキューに追加 (JSON from stdin)
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
      const carried = carryOverTasks(plan);
      if (carried > 0) {
        savePlan(plan);
        console.log(`📦 ${carried}件のタスクを繰越しました`);
      }
      printPlan(plan);
      break;
    }

    case 'status': {
      const plan = loadPlan(todayStr());
      if (!plan) {
        console.log('今日のスケジュールがありません');
        process.exit(1);
      }
      const carried = carryOverTasks(plan);
      if (carried > 0) {
        savePlan(plan);
        console.log(`📦 ${carried}件のタスクを繰越しました`);
      }
      const entry = getCurrentEntry(plan);
      if (!entry) {
        const nextFixed = getNextFixedBlock(plan);
        console.log('現在アクティブなエントリなし');
        if (nextFixed) {
          console.log(`次の予定: ${nextFixed.title} (${nextFixed.start})`);
        }
        break;
      }
      if (entry.type === 'fixed') {
        const rem = parseTime(entry.end) - parseTime(
          `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        );
        console.log(`🗣️ ${entry.title}`);
        console.log(`   ${entry.start} - ${entry.end} (残り${rem}分)`);
        break;
      }
      // WorkSlot
      const slot = getCurrentWorkSlot(plan);
      if (!slot) break;
      activateNextTask(slot);
      savePlan(plan);
      const remaining = remainingSlotMinutes(plan);
      const active = getActiveTask(slot);
      const nextFixed = getNextFixedBlock(plan);
      console.log(`📂 作業枠: ${slot.start} - ${slot.end} (残り${remaining}分)`);
      if (active) {
        console.log(`▶ ${active.title} (${active.estimatedMinutes}m) [${active.kind}]`);
      } else {
        const allDone = slot.queue.every(
          (t) => t.status === 'completed' || t.status === 'skipped',
        );
        if (allDone && slot.queue.length > 0) {
          console.log(`✅ スロット完了! 次の予定まで ${remaining}分 余裕あり`);
        } else {
          console.log('キューにタスクがありません');
        }
      }
      if (nextFixed) {
        console.log(`次の予定: ${nextFixed.title} (${nextFixed.start})`);
      }
      break;
    }

    case 'complete': {
      const plan = loadPlan(todayStr());
      if (!plan) {
        console.log('今日のスケジュールがありません');
        process.exit(1);
      }
      carryOverTasks(plan);
      const slot = getCurrentWorkSlot(plan);
      if (slot) activateNextTask(slot);
      const result = completeCurrentTask(plan);
      savePlan(plan);
      if (result.completed) {
        console.log(`✅ 完了: ${result.completed.title}`);
        if (result.next) {
          console.log(`→ 次: ${result.next.title} (${result.next.estimatedMinutes}m)`);
        } else {
          console.log('キューにタスクがありません');
        }
      } else {
        console.log('完了するタスクがありません');
      }
      break;
    }

    case 'skip': {
      const plan = loadPlan(todayStr());
      if (!plan) {
        console.log('今日のスケジュールがありません');
        process.exit(1);
      }
      carryOverTasks(plan);
      const slot = getCurrentWorkSlot(plan);
      if (slot) activateNextTask(slot);
      const result = skipCurrentTask(plan);
      savePlan(plan);
      if (result.skipped) {
        console.log(`⏭ スキップ: ${result.skipped.title}`);
        if (result.next) {
          console.log(`→ 次: ${result.next.title} (${result.next.estimatedMinutes}m)`);
        } else {
          console.log('キューにタスクがありません');
        }
      } else {
        console.log('スキップするタスクがありません');
      }
      break;
    }

    case 'add-task': {
      const input = await readStdin();
      const data = JSON.parse(input);
      const plan = loadPlan(todayStr());
      if (!plan) {
        console.log('今日のスケジュールがありません');
        process.exit(1);
      }
      carryOverTasks(plan);
      const task = addTaskToSlot(plan, {
        title: data.title,
        estimatedMinutes: data.estimatedMinutes ?? 30,
        kind: data.kind ?? 'other',
        beadId: data.beadId,
      }, data.slotIndex);
      if (task) {
        const slot = getCurrentWorkSlot(plan);
        if (slot) activateNextTask(slot);
        savePlan(plan);
        console.log(`➕ 追加: ${task.title} (${task.estimatedMinutes}m) [${task.kind}]`);
      } else {
        console.log('追加先の作業枠がありません');
      }
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
