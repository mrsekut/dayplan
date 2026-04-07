import { load, save, ensureDir } from '../storage';
import {
  swapBlocks,
  addSubtask,
  toggleSubtask,
  removeSubtask,
  addBlock,
  removeBlock,
  completeBlock,
  carryOverBlocks,
  type Schedule,
  type TimeBlock,
} from '../core/schedule';
import serveHtml from '../view/serve.html';

const PORT = 3456;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrow(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getSchedule(date: string): Promise<Schedule> {
  await ensureDir();
  const schedule = await load(date);
  if (!schedule) return { date, blocks: [] };
  return schedule;
}

export async function serveCommand(date?: string): Promise<void> {
  const targetDate = date ?? today();

  Bun.serve({
    port: PORT,
    routes: {
      '/:date': serveHtml,
    },
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/') {
        return Response.redirect(`/${targetDate}`, 302);
      }

      // GET /api/schedule/:date
      if (req.method === 'GET' && url.pathname.startsWith('/api/schedule/')) {
        const d = url.pathname.split('/')[3]!;
        const schedule = await getSchedule(d);
        return json(schedule);
      }

      // PUT /api/schedule/:date
      if (req.method === 'PUT' && url.pathname.startsWith('/api/schedule/')) {
        const d = url.pathname.split('/')[3]!;
        const body = (await req.json()) as { blocks: TimeBlock[] };
        const schedule: Schedule = { date: d, blocks: body.blocks };
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/swap
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/swap$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { indexA, indexB } = (await req.json()) as {
          indexA: number;
          indexB: number;
        };
        let schedule = await getSchedule(d);
        schedule = swapBlocks(schedule, indexA, indexB);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/complete
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/complete$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { task } = (await req.json()) as { task: string };
        let schedule = await getSchedule(d);
        schedule = completeBlock(schedule, task);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/add
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/add$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const block = (await req.json()) as TimeBlock;
        let schedule = await getSchedule(d);
        schedule = addBlock(schedule, block);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/remove
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/remove$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { task } = (await req.json()) as { task: string };
        let schedule = await getSchedule(d);
        schedule = removeBlock(schedule, task);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/subtask/add
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/subtask\/add$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { task, title } = (await req.json()) as {
          task: string;
          title: string;
        };
        let schedule = await getSchedule(d);
        schedule = addSubtask(schedule, task, title);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/subtask/toggle
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/subtask\/toggle$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { task, index } = (await req.json()) as {
          task: string;
          index: number;
        };
        let schedule = await getSchedule(d);
        schedule = toggleSubtask(schedule, task, index);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/subtask/remove
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/subtask\/remove$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { task, index } = (await req.json()) as {
          task: string;
          index: number;
        };
        let schedule = await getSchedule(d);
        schedule = removeSubtask(schedule, task, index);
        await save(schedule);
        return json(schedule);
      }

      // POST /api/schedule/:date/carry
      if (
        req.method === 'POST' &&
        url.pathname.match(/^\/api\/schedule\/[^/]+\/carry$/)
      ) {
        const d = url.pathname.split('/')[3]!;
        const { tasks } = (await req.json()) as { tasks: string[] };
        const fromSchedule = await getSchedule(d);
        const nextDate = tomorrow(d);
        const toSchedule = await getSchedule(nextDate);
        const result = carryOverBlocks(fromSchedule, toSchedule, tasks);
        await save(result.from);
        await save(result.to);
        return json({ from: result.from, to: result.to, nextDate });
      }

      return new Response('Not Found', { status: 404 });
    },
    development: {
      hmr: true,
      console: true,
    },
  });

  console.log(`http://localhost:${PORT}/${targetDate}`);
}
