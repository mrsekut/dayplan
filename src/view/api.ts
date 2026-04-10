import type { ScheduleData } from './types';

const BASE = '';

async function request(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchSchedule(date: string): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}`)) as {
    date: string;
    blocks: ScheduleData['blocks'];
  };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function swapBlocks(
  date: string,
  indexA: number,
  indexB: number,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/swap`, 'POST', {
    indexA,
    indexB,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function completeTask(
  date: string,
  task: string,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/complete`, 'POST', {
    task,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function addSubtask(
  date: string,
  task: string,
  title: string,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/subtask/add`, 'POST', {
    task,
    title,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function toggleSubtask(
  date: string,
  task: string,
  index: number,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/subtask/toggle`, 'POST', {
    task,
    index,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function removeSubtask(
  date: string,
  task: string,
  index: number,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/subtask/remove`, 'POST', {
    task,
    index,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function skipTask(
  date: string,
  task: string,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/skip`, 'POST', {
    task,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function updateBlockTime(
  date: string,
  task: string,
  start: string,
  end: string,
): Promise<ScheduleData> {
  const data = (await request(`/api/schedule/${date}/update-time`, 'POST', {
    task,
    start,
    end,
  })) as { date: string; blocks: ScheduleData['blocks'] };
  return {
    date: data.date,
    title: `${data.date} スケジュール`,
    blocks: data.blocks,
  };
}

export async function carryOver(
  date: string,
  tasks: string[],
): Promise<{ from: ScheduleData; nextDate: string }> {
  const data = (await request(`/api/schedule/${date}/carry`, 'POST', {
    tasks,
  })) as {
    from: { date: string; blocks: ScheduleData['blocks'] };
    nextDate: string;
  };
  return {
    from: {
      date: data.from.date,
      title: `${data.from.date} スケジュール`,
      blocks: data.from.blocks,
    },
    nextDate: data.nextDate,
  };
}
