import { addBlock, parseSchedule } from '../core/schedule';
import { ensureDir, load, save } from '../storage';

export async function addCommand(
  date: string,
  jsonFlag: boolean,
): Promise<void> {
  const input = await Bun.stdin.text();
  if (!input.trim()) {
    throw new Error(
      'No input. Pipe a block to stdin: echo \'{"start":"10:00","end":"10:30","task":"foo","kind":"作業系"}\' | dayplan add <date>',
    );
  }

  const blockData = (() => {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      throw new Error('Invalid JSON for block');
    }
  })();

  // Validate by wrapping in a schedule and parsing
  const wrapper = JSON.stringify({ date, blocks: [blockData] });
  const parsed = parseSchedule(wrapper);
  const block = parsed.blocks[0]!;

  const schedule = (await load(date)) ?? { date, blocks: [] };

  const updated = addBlock(schedule, block);
  await ensureDir();
  await save(updated);

  if (jsonFlag) {
    console.log(
      JSON.stringify({ ok: true, date, blocks: updated.blocks.length }),
    );
  } else {
    console.log(`✓ Added "${block.task}" (${block.start}-${block.end})`);
  }
}
