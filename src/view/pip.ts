import type { ScheduleBlock } from './types';
import { timeToMin, KIND_COLORS } from './utils';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options: {
        width: number;
        height: number;
      }): Promise<Window>;
    };
  }
}

type CurrentInfo = {
  task: string;
  remaining: string;
  kind: string;
  progress: number;
};

function getCurrentInfo(schedule: ScheduleBlock[]): CurrentInfo | null {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getSeconds();
  const current = schedule.find(
    s => nowMin >= timeToMin(s.start) && nowMin < timeToMin(s.end),
  );

  if (!current) {
    if (schedule.length === 0) return null;
    if (nowMin < timeToMin(schedule[0]!.start))
      return { task: '開始前', remaining: '', kind: '-', progress: 0 };
    return { task: '終了', remaining: '', kind: '-', progress: 1 };
  }

  const startMin = timeToMin(current.start);
  const endMin = timeToMin(current.end);
  const totalSec = (endMin - startMin) * 60;
  const elapsedSec = (nowMin - startMin) * 60 + nowSec;
  const remainSec = Math.max(0, totalSec - elapsedSec);
  const remainMin = Math.ceil(remainSec / 60);
  const progress = elapsedSec / totalSec;

  return {
    task: current.task,
    remaining: remainMin + '分',
    kind: current.kind,
    progress,
  };
}

function updatePip(pipWindow: Window, schedule: ScheduleBlock[]): boolean {
  if (pipWindow.closed) return false;

  const info = getCurrentInfo(schedule);
  if (!info) return true;

  const taskEl = pipWindow.document.getElementById('pip-task');
  const remainEl = pipWindow.document.getElementById('pip-remain');
  const bar = pipWindow.document.getElementById('pip-bar');
  const container = pipWindow.document.getElementById('pip-container');
  if (!taskEl || !remainEl || !bar || !container) return true;

  const colors = KIND_COLORS[info.kind] ?? KIND_COLORS['-']!;
  container.style.borderLeftColor = colors.fg;
  taskEl.textContent = info.task;
  remainEl.textContent = info.remaining ? '残り ' + info.remaining : info.task;
  bar.style.width = info.progress * 100 + '%';
  bar.style.background = colors.fg;

  return true;
}

export function setupPip(
  btn: HTMLButtonElement,
  schedule: ScheduleBlock[],
): void {
  let pipWindow: Window | null = null;
  let pipInterval: ReturnType<typeof setInterval> | null = null;

  if (!window.documentPictureInPicture) {
    btn.disabled = true;
    btn.title = 'このブラウザはDocument PiP非対応です';
    return;
  }

  function closePip(): void {
    if (pipInterval) {
      clearInterval(pipInterval);
      pipInterval = null;
    }
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    pipWindow = null;
    btn.classList.remove('active');
    btn.textContent = 'PiP';
  }

  btn.addEventListener('click', async () => {
    if (pipWindow && !pipWindow.closed) {
      closePip();
      return;
    }

    try {
      pipWindow = await window.documentPictureInPicture!.requestWindow({
        width: 340,
        height: 90,
      });
    } catch (e) {
      console.error('PiP error:', e);
      return;
    }

    const info = getCurrentInfo(schedule);
    const colors = info
      ? (KIND_COLORS[info.kind] ?? KIND_COLORS['-']!)
      : KIND_COLORS['-']!;

    pipWindow.document.body.innerHTML = '';

    const style = pipWindow.document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif;
        background: #0f0f0f;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
        user-select: none;
      }
      #pip-container {
        width: 100%;
        padding: 12px 16px;
        border-left: 4px solid ${colors.fg};
      }
      #pip-task {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #pip-remain {
        font-size: 20px;
        font-weight: 700;
        color: #ff4444;
        font-variant-numeric: tabular-nums;
        margin-bottom: 6px;
      }
      .pip-progress {
        width: 100%;
        height: 3px;
        background: #222;
        border-radius: 2px;
        overflow: hidden;
      }
      #pip-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 1s linear;
      }
    `;
    pipWindow.document.head.appendChild(style);

    const container = pipWindow.document.createElement('div');
    container.id = 'pip-container';
    container.innerHTML = `
      <div id="pip-task">${info ? info.task : '-'}</div>
      <div id="pip-remain">${info?.remaining ? '残り ' + info.remaining : '-'}</div>
      <div class="pip-progress"><div id="pip-bar" style="width:${info ? info.progress * 100 : 0}%;background:${colors.fg}"></div></div>
    `;
    pipWindow.document.body.appendChild(container);

    btn.classList.add('active');
    btn.textContent = 'PiP ON';

    updatePip(pipWindow, schedule);
    pipInterval = setInterval(() => {
      if (!pipWindow || !updatePip(pipWindow, schedule)) {
        closePip();
      }
    }, 1000);

    pipWindow.addEventListener('pagehide', () => closePip());
  });
}
