import { join } from 'path';
import { homedir } from 'os';
import type { Schedule } from './core/schedule';

const CONFIG_DIR = join(homedir(), '.config', 'dayplan');

function filePath(date: string): string {
  return join(CONFIG_DIR, `${date}.json`);
}

/** スケジュールを保存 */
export async function save(schedule: Schedule): Promise<void> {
  await Bun.write(
    Bun.file(filePath(schedule.date)),
    JSON.stringify(schedule, null, '\t') + '\n',
  );
}

/** スケジュールを読み込み */
export async function load(date: string): Promise<Schedule | null> {
  const file = Bun.file(filePath(date));
  if (!(await file.exists())) return null;
  const text = await file.text();
  return JSON.parse(text) as Schedule;
}

/** 設定ディレクトリを確保 */
export async function ensureDir(): Promise<void> {
  const { mkdir } = await import('fs/promises');
  await mkdir(CONFIG_DIR, { recursive: true });
}
