import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { DayPlan } from './schedule';

const CONFIG_DIR = join(homedir(), '.config', 'dayplan2');

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function planPath(date: string): string {
  return join(CONFIG_DIR, `${date}.json`);
}

export function savePlan(plan: DayPlan): void {
  ensureDir();
  Bun.write(planPath(plan.date), JSON.stringify(plan, null, '\t'));
}

export function loadPlan(date: string): DayPlan | null {
  const path = planPath(date);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as DayPlan;
}
