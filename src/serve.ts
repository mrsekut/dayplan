#!/usr/bin/env bun
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  type DayPlan,
  todayStr,
  completeCurrentTask,
  skipCurrentTask,
  getCurrentWorkSlot,
  activateNextTask,
  carryOverTasks,
} from './schedule';
import { loadPlan, savePlan } from './storage';

const dateArg = process.argv.find(
  a =>
    a !== 'serve' &&
    !a.endsWith('serve.ts') &&
    !a.includes('bun') &&
    /^\d{4}-\d{2}-\d{2}$/.test(a),
);
const date = dateArg ?? todayStr();
const PORT = 3456;

function getPlan(): DayPlan | null {
  const plan = loadPlan(date);
  if (plan) {
    carryOverTasks(plan);
    const slot = getCurrentWorkSlot(plan);
    if (slot) activateNextTask(slot);
    savePlan(plan);
  }
  return plan;
}

const htmlTemplate = readFileSync(
  join(import.meta.dir, 'view.html'),
  'utf-8',
);
const html = htmlTemplate.replace('<title>dayplan</title>', `<title>dayplan - ${date}</title>`);

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/' || url.pathname === '') {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname.startsWith('/api/plan/')) {
      const d = url.pathname.split('/').pop() ?? date;
      const plan = loadPlan(d);
      if (!plan) return Response.json({ error: 'not found' }, { status: 404 });
      carryOverTasks(plan);
      const slot = getCurrentWorkSlot(plan);
      if (slot) activateNextTask(slot);
      savePlan(plan);
      return Response.json(plan);
    }

    if (url.pathname === '/api/complete' && req.method === 'POST') {
      const plan = getPlan();
      if (!plan)
        return Response.json({ error: 'no plan' }, { status: 404 });
      const result = completeCurrentTask(plan);
      savePlan(plan);
      if (result.completed?.beadId) {
        try {
          Bun.spawnSync(['bd', 'close', result.completed.beadId]);
        } catch {}
      }
      return Response.json(result);
    }

    if (url.pathname === '/api/skip' && req.method === 'POST') {
      const plan = getPlan();
      if (!plan)
        return Response.json({ error: 'no plan' }, { status: 404 });
      const result = skipCurrentTask(plan);
      savePlan(plan);
      return Response.json(result);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🌐 dayplan serve: http://localhost:${PORT}/ (date: ${date})`);
