import { describe, test, expect } from 'bun:test';
import {
  type DayPlan,
  type WorkSlot,
  type Task,
  activateNextTask,
  completeCurrentTask,
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
