import { describe, test, expect } from 'bun:test';
import { buildDayPlan, distributeTasks, type TaskInput } from './planner';
import type { FixedBlock, WorkSlot } from './schedule';

function fixed(
  start: string,
  end: string,
  title: string,
  kind: FixedBlock['kind'] = 'mtg',
): FixedBlock {
  return { id: `test-${start}`, type: 'fixed', start, end, title, kind };
}

function e(plan: { entries: readonly unknown[] }, i: number) {
  const entry = plan.entries[i];
  if (!entry) throw new Error(`entries[${i}] is undefined`);
  return entry as {
    type: string;
    start: string;
    end: string;
    queue?: { title: string; status: string }[];
  };
}

function workSlots(plan: { entries: readonly unknown[] }): WorkSlot[] {
  return plan.entries.filter((e): e is WorkSlot => (e as any).type === 'work');
}

function task(
  title: string,
  minutes: number,
  kind = 'focus' as const,
): TaskInput {
  return { title, estimatedMinutes: minutes, kind };
}

describe('buildDayPlan', () => {
  test('固定ブロック2つ → 間に作業枠が生成される', () => {
    const blocks = [
      fixed('11:00', '12:00', 'MTG A'),
      fixed('14:00', '15:00', 'MTG B'),
    ];
    const plan = buildDayPlan('2026-04-10', blocks);

    expect(plan.date).toBe('2026-04-10');
    expect(plan.entries).toHaveLength(5);

    expect(e(plan, 0).type).toBe('work');
    expect(e(plan, 0).start).toBe('09:00');
    expect(e(plan, 0).end).toBe('11:00');

    expect(e(plan, 1).type).toBe('fixed');
    expect(e(plan, 1).start).toBe('11:00');

    expect(e(plan, 2).type).toBe('work');
    expect(e(plan, 2).start).toBe('12:00');
    expect(e(plan, 2).end).toBe('14:00');

    expect(e(plan, 3).type).toBe('fixed');
    expect(e(plan, 3).start).toBe('14:00');

    expect(e(plan, 4).type).toBe('work');
    expect(e(plan, 4).start).toBe('15:00');
    expect(e(plan, 4).end).toBe('18:00');
  });

  test('固定ブロックなし → 1日全体が1つの作業枠', () => {
    const plan = buildDayPlan('2026-04-10', []);

    expect(plan.entries).toHaveLength(1);
    expect(e(plan, 0).type).toBe('work');
    expect(e(plan, 0).start).toBe('09:00');
    expect(e(plan, 0).end).toBe('18:00');
  });

  test('固定ブロックが隣接 → 間に作業枠なし', () => {
    const blocks = [
      fixed('10:00', '11:00', 'MTG A'),
      fixed('11:00', '12:00', 'MTG B'),
    ];
    const plan = buildDayPlan('2026-04-10', blocks);

    expect(plan.entries).toHaveLength(4);
    expect(e(plan, 0).type).toBe('work');
    expect(e(plan, 0).end).toBe('10:00');
    expect(e(plan, 1).type).toBe('fixed');
    expect(e(plan, 2).type).toBe('fixed');
    expect(e(plan, 3).type).toBe('work');
    expect(e(plan, 3).start).toBe('12:00');
  });

  test('固定ブロックが作業日の開始に接する', () => {
    const blocks = [fixed('09:00', '10:00', '朝MTG')];
    const plan = buildDayPlan('2026-04-10', blocks);

    expect(plan.entries).toHaveLength(2);
    expect(e(plan, 0).type).toBe('fixed');
    expect(e(plan, 0).start).toBe('09:00');
    expect(e(plan, 1).type).toBe('work');
    expect(e(plan, 1).start).toBe('10:00');
  });

  test('固定ブロックが作業日の終了に接する', () => {
    const blocks = [fixed('17:00', '18:00', '夕MTG')];
    const plan = buildDayPlan('2026-04-10', blocks);

    expect(plan.entries).toHaveLength(2);
    expect(e(plan, 0).type).toBe('work');
    expect(e(plan, 0).end).toBe('17:00');
    expect(e(plan, 1).type).toBe('fixed');
    expect(e(plan, 1).start).toBe('17:00');
  });

  test('固定ブロックが未ソートでも正しく処理される', () => {
    const blocks = [
      fixed('14:00', '15:00', 'MTG B'),
      fixed('10:00', '11:00', 'MTG A'),
    ];
    const plan = buildDayPlan('2026-04-10', blocks);

    expect(plan.entries).toHaveLength(5);
    expect(e(plan, 0).start).toBe('09:00');
    expect(e(plan, 1).start).toBe('10:00');
    expect(e(plan, 2).start).toBe('11:00');
    expect(e(plan, 3).start).toBe('14:00');
    expect(e(plan, 4).start).toBe('15:00');
  });

  test('作業枠のqueueは空配列で初期化される', () => {
    const plan = buildDayPlan('2026-04-10', []);
    const slot = e(plan, 0);
    expect(slot.type).toBe('work');
    expect(slot.queue).toEqual([]);
  });

  test('カスタムのdayStart/dayEndが指定できる', () => {
    const plan = buildDayPlan('2026-04-10', [], '10:00', '17:00');

    expect(plan.entries).toHaveLength(1);
    expect(e(plan, 0).start).toBe('10:00');
    expect(e(plan, 0).end).toBe('17:00');
  });
});

describe('distributeTasks', () => {
  test('タスクが作業枠に振り分けられる', () => {
    const plan = buildDayPlan('2026-04-10', [
      fixed('12:00', '13:00', '昼休み', 'other'),
    ]);
    // 09:00-12:00 (180m) work, 12:00-13:00 fixed, 13:00-18:00 (300m) work
    const tasks = [
      task('タスクA', 60),
      task('タスクB', 90),
      task('タスクC', 120),
    ];
    const result = distributeTasks(plan, tasks);
    const slots = workSlots(result);

    expect(slots).toHaveLength(2);
    expect(slots[0]!.queue).toHaveLength(2); // A(60) + B(90) = 150 < 180
    expect(slots[1]!.queue).toHaveLength(1); // C(120) < 300
  });

  test('容量を超えたら次の枠にあふれる', () => {
    const plan = buildDayPlan('2026-04-10', [fixed('10:00', '10:30', 'MTG')]);
    // 09:00-10:00 (60m) work, 10:30-18:00 (450m) work
    const tasks = [
      task('大きいタスク', 90), // 60mの枠に入らない→次の枠へ
    ];
    const result = distributeTasks(plan, tasks);
    const slots = workSlots(result);

    expect(slots[0]!.queue).toHaveLength(0);
    expect(slots[1]!.queue).toHaveLength(1);
    expect(slots[1]!.queue[0]!.title).toBe('大きいタスク');
  });

  test('タスク0個 → キューは空のまま', () => {
    const plan = buildDayPlan('2026-04-10', []);
    const result = distributeTasks(plan, []);
    const slots = workSlots(result);

    expect(slots[0]!.queue).toHaveLength(0);
  });

  test('作業枠が1つだけ → 全タスクがそこに入る', () => {
    const plan = buildDayPlan('2026-04-10', []);
    const tasks = [task('A', 30), task('B', 30), task('C', 30)];
    const result = distributeTasks(plan, tasks);
    const slots = workSlots(result);

    expect(slots).toHaveLength(1);
    expect(slots[0]!.queue).toHaveLength(3);
  });

  test('全タスクのstatusがpendingで初期化される', () => {
    const plan = buildDayPlan('2026-04-10', []);
    const result = distributeTasks(plan, [task('A', 30)]);
    const slots = workSlots(result);

    expect(slots[0]!.queue[0]!.status).toBe('pending');
  });

  test('最後の枠を超えても最後の枠に詰められる', () => {
    const plan = buildDayPlan('2026-04-10', [
      fixed('10:00', '17:00', '長いMTG'),
    ]);
    // 09:00-10:00 (60m) work, 17:00-18:00 (60m) work
    const tasks = [
      task('A', 50),
      task('B', 50), // Aで枠1が埋まる→Bは枠2へ
      task('C', 50), // 枠2も溢れるが最後なのでここに入る
    ];
    const result = distributeTasks(plan, tasks);
    const slots = workSlots(result);

    expect(slots[0]!.queue).toHaveLength(1);
    expect(slots[1]!.queue).toHaveLength(2);
  });
});
