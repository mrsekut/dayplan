import { parseSchedule } from '../core/schedule';
import { ensureDir, save } from '../storage';

export async function setCommand(
  date: string,
  jsonFlag: boolean,
): Promise<void> {
  const input = await Bun.stdin.text();
  if (!input.trim()) {
    throw new Error(
      "No input. Pipe JSON to stdin: echo '{...}' | dayplan set <date>",
    );
  }

  const schedule = parseSchedule(input);
  if (schedule.date !== date) {
    throw new Error(
      `Date mismatch: JSON has "${schedule.date}" but argument is "${date}"`,
    );
  }

  await ensureDir();
  await save(schedule);

  if (jsonFlag) {
    console.log(
      JSON.stringify({ ok: true, date, blocks: schedule.blocks.length }),
    );
  } else {
    console.log(`✓ ${date}: ${schedule.blocks.length} blocks saved`);
  }
}
