import { formatStatus } from '../core/format';
import { getCurrentBlock } from '../core/schedule';
import { load } from '../storage';

export async function statusCommand(
  date: string,
  jsonFlag: boolean,
): Promise<void> {
  const schedule = await load(date);
  if (!schedule) {
    throw new Error(`No schedule for ${date}. Use: dayplan set ${date}`);
  }

  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (jsonFlag) {
    const current = getCurrentBlock(schedule, nowStr);
    console.log(JSON.stringify({ now: nowStr, current }));
  } else {
    console.log(formatStatus(schedule, nowStr));
  }
}
