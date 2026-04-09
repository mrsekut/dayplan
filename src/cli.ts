import {
  type FixedBlock,
  type DayPlan,
  parseTime,
  nowMinutes,
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
const jsonMode = args.includes('--json');

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

function output(data: unknown, humanFn: () => void) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    humanFn();
  }
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
  console.log();
}

function loadPlanOrExit(date: string): DayPlan {
  const plan = loadPlan(date);
  if (!plan) {
    if (jsonMode) {
      console.log(
        JSON.stringify({ error: `${date} のスケジュールがありません` }),
      );
    } else {
      console.log(`${date} のスケジュールがありません`);
    }
    process.exit(1);
  }
  return plan;
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
  dayplan prime            AI向けフルコンテキスト出力
  dayplan help             このヘルプを表示

全コマンドで --json フラグが使えます。

入力フォーマット (set):
  {
    "date": "2026-04-10",
    "fixedBlocks": [
      { "start": "11:30", "end": "12:00", "title": "1on1", "kind": "mtg" }
    ],
    "tasks": [
      { "title": "設計", "estimatedMinutes": 60, "kind": "focus" }
    ]
  }

入力フォーマット (add-task):
  { "title": "急ぎ対応", "estimatedMinutes": 20, "kind": "batch" }`);
}

function printPrime() {
  const today = todayStr();
  const plan = loadPlan(today);

  console.log(`# dayplan v2 — AI Context

## 概要
1日を「固定ブロック（MTG等）」と「作業枠」に分け、作業枠内はタスクキューで管理するCLIツール。

## コマンド
- \`dayplan set\`: stdinからJSONでスケジュール設定
- \`dayplan show [date]\`: スケジュール表示
- \`dayplan status\`: 現在のタスクと残り時間
- \`dayplan complete\`: 現在のタスクを完了
- \`dayplan skip\`: 現在のタスクをスキップ
- \`dayplan add-task\`: タスクをキューに追加
- 全コマンドで \`--json\` フラグ対応

## データモデル
- FixedBlock: 動かせない予定（MTG等）。start, end, title, kind
- WorkSlot: 固定ブロック間の作業時間。タスクのキュー(queue)を持つ
- Task: title, estimatedMinutes, kind(focus/batch/mtg/other), status(pending/active/completed/skipped)
- DayPlan: date + entries(FixedBlock | WorkSlot の配列)

## setの入力フォーマット
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "fixedBlocks": [{ "start": "HH:MM", "end": "HH:MM", "title": "...", "kind": "mtg" }],
  "tasks": [{ "title": "...", "estimatedMinutes": 60, "kind": "focus" }]
}
\`\`\`

## add-taskの入力フォーマット
\`\`\`json
{ "title": "...", "estimatedMinutes": 20, "kind": "batch" }
\`\`\`

## ワークフロー
1. 朝: Googleカレンダーから固定予定を取得し、タスクリストと合わせて \`dayplan set\` で投入
2. 日中: \`dayplan status\` で今のタスク確認 → 完了したら \`dayplan complete\` → 次タスクへ
3. 差し込み: \`dayplan add-task\` でキューに追加
4. スキップ: \`dayplan skip\` で今のタスクを飛ばす`);

  if (plan) {
    console.log(`\n## 現在のスケジュール (${today})`);
    console.log('```');
    for (const entry of plan.entries) {
      if (entry.type === 'fixed') {
        console.log(
          `${entry.start}-${entry.end} [${entry.kind}] ${entry.title}`,
        );
      } else {
        const duration = parseTime(entry.end) - parseTime(entry.start);
        console.log(`${entry.start}-${entry.end} [作業枠 ${duration}分]`);
        for (const task of entry.queue) {
          const icon =
            task.status === 'active'
              ? '>'
              : task.status === 'completed'
                ? 'v'
                : task.status === 'skipped'
                  ? 'x'
                  : '-';
          console.log(
            `  ${icon} ${task.title} (${task.estimatedMinutes}m) [${task.kind}] ${task.status}`,
          );
        }
      }
    }
    console.log('```');
  } else {
    console.log(`\n## 現在のスケジュール\nなし`);
  }
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
      const workSlots = plan.entries.filter(e => e.type === 'work');
      const taskCount = workSlots.reduce(
        (sum, e) => sum + (e.type === 'work' ? e.queue.length : 0),
        0,
      );
      output(
        {
          ok: true,
          date,
          entryCount: plan.entries.length,
          fixedCount: plan.entries.filter(e => e.type === 'fixed').length,
          workSlotCount: workSlots.length,
          taskCount,
        },
        () => {
          console.log(`✅ ${date} のスケジュールを設定しました`);
          printPlan(plan);
        },
      );
      break;
    }

    case 'show': {
      const dateArg = args.find(a => a !== 'show' && a !== '--json');
      const date = dateArg ?? todayStr();
      const plan = loadPlanOrExit(date);
      const carried = carryOverTasks(plan);
      if (carried > 0) savePlan(plan);
      output({ ...plan, carriedOver: carried }, () => {
        if (carried > 0) console.log(`📦 ${carried}件のタスクを繰越しました`);
        printPlan(plan);
      });
      break;
    }

    case 'status': {
      const plan = loadPlanOrExit(todayStr());
      const carried = carryOverTasks(plan);
      if (carried > 0) savePlan(plan);
      const entry = getCurrentEntry(plan);
      const now = nowMinutes();

      if (!entry) {
        const nextFixed = getNextFixedBlock(plan);
        output(
          {
            currentEntry: null,
            activeTask: null,
            remainingMinutes: null,
            nextFixed,
            carriedOver: carried,
          },
          () => {
            if (carried > 0)
              console.log(`📦 ${carried}件のタスクを繰越しました`);
            console.log('現在アクティブなエントリなし');
            if (nextFixed)
              console.log(`次の予定: ${nextFixed.title} (${nextFixed.start})`);
          },
        );
        break;
      }

      if (entry.type === 'fixed') {
        const rem = parseTime(entry.end) - now;
        output(
          {
            currentEntry: entry,
            activeTask: null,
            remainingMinutes: rem,
            nextFixed: getNextFixedBlock(plan),
            carriedOver: carried,
          },
          () => {
            console.log(`🗣️ ${entry.title}`);
            console.log(`   ${entry.start} - ${entry.end} (残り${rem}分)`);
          },
        );
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

      output(
        {
          currentEntry: slot,
          activeTask: active,
          remainingMinutes: remaining,
          nextFixed,
          carriedOver: carried,
        },
        () => {
          if (carried > 0) console.log(`📦 ${carried}件のタスクを繰越しました`);
          console.log(
            `📂 作業枠: ${slot.start} - ${slot.end} (残り${remaining}分)`,
          );
          if (active) {
            console.log(
              `▶ ${active.title} (${active.estimatedMinutes}m) [${active.kind}]`,
            );
          } else {
            const allDone = slot.queue.every(
              t => t.status === 'completed' || t.status === 'skipped',
            );
            if (allDone && slot.queue.length > 0) {
              console.log(
                `✅ スロット完了! 次の予定まで ${remaining}分 余裕あり`,
              );
            } else {
              console.log('キューにタスクがありません');
            }
          }
          if (nextFixed)
            console.log(`次の予定: ${nextFixed.title} (${nextFixed.start})`);
        },
      );
      break;
    }

    case 'complete': {
      const plan = loadPlanOrExit(todayStr());
      carryOverTasks(plan);
      const slot = getCurrentWorkSlot(plan);
      if (slot) activateNextTask(slot);
      const result = completeCurrentTask(plan);
      savePlan(plan);
      output({ completed: result.completed, next: result.next }, () => {
        if (result.completed) {
          console.log(`✅ 完了: ${result.completed.title}`);
          if (result.next) {
            console.log(
              `→ 次: ${result.next.title} (${result.next.estimatedMinutes}m)`,
            );
          } else {
            console.log('キューにタスクがありません');
          }
        } else {
          console.log('完了するタスクがありません');
        }
      });
      break;
    }

    case 'skip': {
      const plan = loadPlanOrExit(todayStr());
      carryOverTasks(plan);
      const slot = getCurrentWorkSlot(plan);
      if (slot) activateNextTask(slot);
      const result = skipCurrentTask(plan);
      savePlan(plan);
      output({ skipped: result.skipped, next: result.next }, () => {
        if (result.skipped) {
          console.log(`⏭ スキップ: ${result.skipped.title}`);
          if (result.next) {
            console.log(
              `→ 次: ${result.next.title} (${result.next.estimatedMinutes}m)`,
            );
          } else {
            console.log('キューにタスクがありません');
          }
        } else {
          console.log('スキップするタスクがありません');
        }
      });
      break;
    }

    case 'add-task': {
      const input = await readStdin();
      const data = JSON.parse(input);
      const plan = loadPlanOrExit(todayStr());
      carryOverTasks(plan);
      const task = addTaskToSlot(
        plan,
        {
          title: data.title,
          estimatedMinutes: data.estimatedMinutes ?? 30,
          kind: data.kind ?? 'other',
          beadId: data.beadId,
        },
        data.slotIndex,
      );
      if (task) {
        const slot = getCurrentWorkSlot(plan);
        if (slot) activateNextTask(slot);
        savePlan(plan);
        output({ added: task }, () =>
          console.log(
            `➕ 追加: ${task.title} (${task.estimatedMinutes}m) [${task.kind}]`,
          ),
        );
      } else {
        output({ added: null, error: '追加先の作業枠がありません' }, () =>
          console.log('追加先の作業枠がありません'),
        );
      }
      break;
    }

    case 'prime':
      printPrime();
      break;

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
