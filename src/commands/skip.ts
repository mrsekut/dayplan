import { skipBlock } from '../core/schedule';
import { load, save } from '../storage';

export async function skipCommand(
  date: string,
  taskName: string,
  jsonFlag: boolean,
): Promise<void> {
  const schedule = await load(date);
  if (!schedule) {
    throw new Error(`No schedule for ${date}. Use: dayplan set ${date}`);
  }

  const updated = skipBlock(schedule, taskName);
  await save(updated);

  if (jsonFlag) {
    console.log(JSON.stringify({ ok: true, date, task: taskName }));
  } else {
    console.log(`⏭ Skipped: "${taskName}"`);
  }
}
