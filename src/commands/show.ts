import { formatSchedule } from '../core/format';
import { load } from '../storage';

export async function showCommand(
  date: string,
  jsonFlag: boolean,
): Promise<void> {
  const schedule = await load(date);
  if (!schedule) {
    throw new Error(`No schedule for ${date}. Use: dayplan set ${date}`);
  }

  if (jsonFlag) {
    console.log(JSON.stringify(schedule, null, '\t'));
  } else {
    console.log(formatSchedule(schedule));
  }
}
