import { join } from 'path';
import { homedir } from 'os';
import {
  calcNotifyPoints,
  generateNotifyScript,
  generatePlist,
} from '../core/notify';
import { load } from '../storage';

const SCRIPT_PATH = '/tmp/dayplan-notify.sh';
const PLIST_PATH = join(
  homedir(),
  'Library',
  'LaunchAgents',
  'com.dayplan.notify.plist',
);
const LABEL = 'com.dayplan.notify';

export async function notifyCommand(
  date: string,
  clear: boolean,
  jsonFlag: boolean,
): Promise<void> {
  if (clear) {
    await clearNotifications(jsonFlag);
    return;
  }

  const schedule = await load(date);
  if (!schedule) {
    throw new Error(`No schedule for ${date}. Use: dayplan set ${date}`);
  }

  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const points = calcNotifyPoints(schedule, nowStr);

  if (points.length === 0) {
    if (jsonFlag) {
      console.log(JSON.stringify({ ok: true, date, notifications: 0 }));
    } else {
      console.log('通知ポイントなし（全タスク終了済みまたは対象なし）');
    }
    return;
  }

  // Unload previous if exists
  await tryUnload();

  const script = generateNotifyScript(points);
  await Bun.write(SCRIPT_PATH, script);

  const plist = generatePlist(SCRIPT_PATH);
  const { mkdir } = await import('fs/promises');
  await mkdir(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
  await Bun.write(PLIST_PATH, plist);

  const proc = Bun.spawn(['launchctl', 'load', PLIST_PATH]);
  await proc.exited;

  if (jsonFlag) {
    console.log(
      JSON.stringify({ ok: true, date, notifications: points.length }),
    );
  } else {
    console.log(`✓ ${points.length} 件の通知を登録`);
    for (const p of points) {
      console.log(`  ${p.time} ${p.message}`);
    }
  }
}

async function clearNotifications(jsonFlag: boolean): Promise<void> {
  await tryUnload();

  const { unlink } = await import('fs/promises');
  try {
    await unlink(SCRIPT_PATH);
  } catch {}
  try {
    await unlink(PLIST_PATH);
  } catch {}

  if (jsonFlag) {
    console.log(JSON.stringify({ ok: true, cleared: true }));
  } else {
    console.log('✓ 通知をクリアしました');
  }
}

async function tryUnload(): Promise<void> {
  const proc = Bun.spawn(
    ['launchctl', 'bootout', `gui/${process.getuid?.() ?? 501}/${LABEL}`],
    {
      stderr: 'ignore',
      stdout: 'ignore',
    },
  );
  await proc.exited;
}
