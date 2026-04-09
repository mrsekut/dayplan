import { describe, test, expect } from 'bun:test';
import {
  type DayPlan,
  type WorkSlot,
  type Task,
  activateNextTask,
  completeCurrentTask,
  skipCurrentTask,
  addTaskToSlot,
  carryOverTasks,
  getCurrentWorkSlot,
  getCurrentEntry,
} from './schedule';

function makeTask(
  title: string,
  status: Task['status'] = 'pending',
): Task {
  return {
    id: `t-${title}`,
    title,
    estimatedMinutes: 30,
    kind: 'focus',
    status,
  };
}

function makeSlot(
  start: string,
  end: string,
  tasks: Task[],
): WorkSlot {
  return { id: 'ws-1', type: 'work', start, end, queue: tasks };
}

function makePlan(entries: DayPlan['entries']): DayPlan {
  return { date: '2026-04-10', entries };
}

describe('activateNextTask', () => {
  test('pendingの最初のタスクをactiveにする', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A'),
      makeTask('B'),
    ]);
    const result = activateNextTask(slot);
    expect(result?.title).toBe('A');
    expect(slot.queue[0]!.status).toBe('active');
    expect(slot.queue[1]!.status).toBe('pending');
  });

  test('既にactiveがある → 何もしない', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'active'),
      makeTask('B'),
    ]);
    const result = activateNextTask(slot);
    expect(result).toBeNull();
  });

  test('全completed → 何もしない', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'completed'),
      makeTask('B', 'completed'),
    ]);
    const result = activateNextTask(slot);
    expect(result).toBeNull();
  });
});

describe('completeCurrentTask', () => {
  test('active→completed、次がactivateされる', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'active'),
      makeTask('B'),
    ]);
    // now=10:00 (600) is within 09:00-12:00
    const plan = makePlan([slot]);
    const result = completeCurrentTask(plan, 600);

    expect(result.completed?.title).toBe('A');
    expect(result.next?.title).toBe('B');
    expect(slot.queue[0]!.status).toBe('completed');
    expect(slot.queue[1]!.status).toBe('active');
  });

  test('最後のタスク完了 → nextがnull', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'active'),
    ]);
    const plan = makePlan([slot]);
    const result = completeCurrentTask(plan, 600);

    expect(result.completed?.title).toBe('A');
    expect(result.next).toBeNull();
  });

  test('activeなタスクなし → 何もしない', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'completed'),
    ]);
    const plan = makePlan([slot]);
    const result = completeCurrentTask(plan, 600);

    expect(result.completed).toBeNull();
    expect(result.next).toBeNull();
  });
});

describe('getCurrentWorkSlot', () => {
  test('作業枠内 → その枠を返す', () => {
    const slot = makeSlot('09:00', '12:00', []);
    const plan = makePlan([slot]);
    const result = getCurrentWorkSlot(plan, 600); // 10:00

    expect(result).toBe(slot);
  });

  test('固定ブロック中 → null', () => {
    const plan = makePlan([
      { id: 'f-1', type: 'fixed', start: '09:00', end: '10:00', title: 'MTG', kind: 'mtg' },
    ]);
    const result = getCurrentWorkSlot(plan, 570); // 09:30

    expect(result).toBeNull();
  });

  test('どのエントリにも該当しない → null', () => {
    const plan = makePlan([
      makeSlot('09:00', '10:00', []),
    ]);
    const result = getCurrentWorkSlot(plan, 660); // 11:00

    expect(result).toBeNull();
  });
});

describe('getCurrentEntry', () => {
  test('固定ブロック中 → その固定ブロックを返す', () => {
    const fixed = { id: 'f-1', type: 'fixed' as const, start: '10:00', end: '11:00', title: 'MTG', kind: 'mtg' as const };
    const plan = makePlan([fixed]);
    const result = getCurrentEntry(plan, 630); // 10:30

    expect(result).toBe(fixed);
  });
});

describe('skipCurrentTask', () => {
  test('active→skipped、次がactivateされる', () => {
    const slot = makeSlot('09:00', '12:00', [
      makeTask('A', 'active'),
      makeTask('B'),
    ]);
    const plan = makePlan([slot]);
    const result = skipCurrentTask(plan, 600);

    expect(result.skipped?.title).toBe('A');
    expect(result.next?.title).toBe('B');
    expect(slot.queue[0]!.status).toBe('skipped');
    expect(slot.queue[1]!.status).toBe('active');
  });

  test('activeなし → 何もしない', () => {
    const slot = makeSlot('09:00', '12:00', [makeTask('A')]);
    const plan = makePlan([slot]);
    const result = skipCurrentTask(plan, 600);

    expect(result.skipped).toBeNull();
  });
});

describe('addTaskToSlot', () => {
  test('現在の作業枠にタスクが追加される', () => {
    const slot = makeSlot('09:00', '12:00', []);
    const plan = makePlan([slot]);
    const task = addTaskToSlot(plan, {
      title: '急ぎ対応',
      estimatedMinutes: 20,
      kind: 'batch',
    }, undefined, 600);

    expect(task).not.toBeNull();
    expect(task!.title).toBe('急ぎ対応');
    expect(slot.queue).toHaveLength(1);
    expect(slot.queue[0]!.status).toBe('pending');
  });

  test('slotIndex指定で特定の枠に追加される', () => {
    const slot0 = makeSlot('09:00', '10:00', []);
    const slot1 = makeSlot('11:00', '12:00', []);
    const plan = makePlan([slot0, slot1]);
    addTaskToSlot(plan, {
      title: 'タスク',
      estimatedMinutes: 30,
      kind: 'focus',
    }, 1, 570);

    expect(slot0.queue).toHaveLength(0);
    expect(slot1.queue).toHaveLength(1);
  });

  test('作業枠なし → null', () => {
    const plan = makePlan([
      { id: 'f-1', type: 'fixed' as const, start: '09:00', end: '18:00', title: 'MTG', kind: 'mtg' as const },
    ]);
    const task = addTaskToSlot(plan, {
      title: 'タスク',
      estimatedMinutes: 30,
      kind: 'focus',
    }, undefined, 600);

    expect(task).toBeNull();
  });
});

describe('carryOverTasks', () => {
  test('過去枠のpendingタスクが現在枠に移る', () => {
    const pastSlot = makeSlot('09:00', '10:00', [
      makeTask('A', 'pending'),
      makeTask('B', 'completed'),
    ]);
    const currentSlot = makeSlot('10:00', '12:00', []);
    const plan = makePlan([pastSlot, currentSlot]);

    const carried = carryOverTasks(plan, 660); // 11:00

    expect(carried).toBe(1);
    expect(pastSlot.queue).toHaveLength(1); // only completed remains
    expect(currentSlot.queue).toHaveLength(1);
    expect(currentSlot.queue[0]!.title).toBe('A');
    expect(currentSlot.queue[0]!.status).toBe('pending');
  });

  test('activeタスクはpendingにリセットされて繰越', () => {
    const pastSlot = makeSlot('09:00', '10:00', [
      makeTask('A', 'active'),
    ]);
    const currentSlot = makeSlot('10:00', '12:00', []);
    const plan = makePlan([pastSlot, currentSlot]);

    const carried = carryOverTasks(plan, 660);

    expect(carried).toBe(1);
    expect(currentSlot.queue[0]!.status).toBe('pending');
  });

  test('completedタスクは移らない', () => {
    const pastSlot = makeSlot('09:00', '10:00', [
      makeTask('A', 'completed'),
    ]);
    const currentSlot = makeSlot('10:00', '12:00', []);
    const plan = makePlan([pastSlot, currentSlot]);

    const carried = carryOverTasks(plan, 660);

    expect(carried).toBe(0);
    expect(currentSlot.queue).toHaveLength(0);
  });

  test('現在枠も未来枠もない → 0件', () => {
    const pastSlot = makeSlot('09:00', '10:00', [makeTask('A')]);
    const plan = makePlan([pastSlot]);

    const carried = carryOverTasks(plan, 1200); // 20:00

    expect(carried).toBe(0);
  });

  test('過去枠が複数 → 全部から繰越', () => {
    const past1 = makeSlot('09:00', '10:00', [makeTask('A')]);
    const past2 = makeSlot('10:00', '11:00', [makeTask('B')]);
    // need unique IDs for past2
    past2.id = 'ws-2';
    const current = makeSlot('11:00', '12:00', []);
    current.id = 'ws-3';
    const plan = makePlan([past1, past2, current]);

    const carried = carryOverTasks(plan, 690); // 11:30

    expect(carried).toBe(2);
    expect(current.queue).toHaveLength(2);
  });
});
