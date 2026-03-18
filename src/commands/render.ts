import { join } from 'path';
import { homedir } from 'os';
import { renderHtml } from '../core/render';
import { load } from '../storage';

export async function renderCommand(
  date: string,
  jsonFlag: boolean,
): Promise<void> {
  const schedule = await load(date);
  if (!schedule) {
    throw new Error(`No schedule for ${date}. Use: dayplan set ${date}`);
  }

  const html = await renderHtml(schedule);
  const outPath = join(homedir(), '.config', 'dayplan', `${date}.html`);
  await Bun.write(outPath, html);

  const proc = Bun.spawn(['open', outPath]);
  await proc.exited;

  if (jsonFlag) {
    console.log(JSON.stringify({ ok: true, date, path: outPath }));
  } else {
    console.log(`✓ HTML saved: ${outPath}`);
  }
}
