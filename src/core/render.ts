import type { Schedule } from './schedule';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

/** Schedule -> 完全な HTML 文字列を返す (Vite + vite-plugin-singlefile ベース) */
export async function renderHtml(schedule: Schedule): Promise<string> {
  // Vite build to produce a single HTML file
  const proc = Bun.spawn(
    ['bunx', 'vite', 'build', '--config', join(ROOT, 'vite.config.ts')],
    { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' },
  );
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Vite build failed (exit ${exitCode}):\n${stderr}`);
  }

  // Read the built single HTML
  const builtPath = join(ROOT, 'dist', 'src', 'view', 'index.html');
  let html = await Bun.file(builtPath).text();

  // Inject schedule data before the app script
  const scheduleData = JSON.stringify({
    date: schedule.date,
    title: `${schedule.date} スケジュール`,
    blocks: schedule.blocks.map(b => ({
      start: b.start,
      end: b.end,
      task: b.task,
      kind: b.kind,
      status: b.status,
    })),
  });

  const dataScript = `<script>window.__SCHEDULE__=${scheduleData};</script>`;

  // Insert before the first <script> tag
  const firstScript = html.indexOf('<script');
  if (firstScript !== -1) {
    html = html.slice(0, firstScript) + dataScript + html.slice(firstScript);
  } else {
    html = html.replace('</head>', dataScript + '</head>');
  }

  // Update <title>
  html = html.replace(
    '<title>Schedule</title>',
    `<title>${schedule.date} スケジュール</title>`,
  );

  return html;
}
