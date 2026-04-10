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

const PIP_STYLES = `
body { margin:0; padding:8px; background:#0d1117; color:#e6edf3; font-family:-apple-system,sans-serif; user-select:none; }
.pip-task { font-size:15px; font-weight:600; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pip-time { font-size:20px; font-weight:700; color:#ff4444; margin-bottom:6px; font-variant-numeric:tabular-nums; }
.pip-bar { height:4px; background:#21262d; border-radius:2px; overflow:hidden; margin-bottom:8px; }
.pip-fill { height:100%; background:#58a6ff; transition:width 1s linear; }
.pip-actions { display:flex; gap:6px; }
.pip-btn { flex:1; padding:4px; border:1px solid #30363d; background:none; color:#e6edf3; border-radius:4px; cursor:pointer; font-size:12px; }
.pip-btn:hover { background:#30363d; }
.pip-btn.complete:hover { background:#238636; border-color:#238636; }
.pip-btn.skip:hover { background:#6e4000; border-color:#6e4000; }
`;

function getNowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function updatePipContent(
  pw: Window,
  getBlocks: () => ScheduleBlock[],
): void {
  if (pw.closed) return;
  const root = pw.document.getElementById('pip-root');
  if (!root) return;

  const blocks = getBlocks();
  const nowMin = getNowMin();

  // 現在のブロックを探す
  const current = blocks.find(
    b => nowMin >= timeToMin(b.start) && nowMin < timeToMin(b.end),
  );

  if (!current) {
    const next = blocks.find(b => timeToMin(b.start) > nowMin);
    if (next) {
      const untilMin = timeToMin(next.start) - nowMin;
      root.innerHTML = `<div class="pip-task">待機中</div><div class="pip-time">${next.task} まで ${untilMin}分</div>`;
    } else {
      root.innerHTML = '<div class="pip-task">本日終了</div>';
    }
    return;
  }

  const remain = timeToMin(current.end) - nowMin;
  const total = timeToMin(current.end) - timeToMin(current.start);
  const progress = total > 0 ? (1 - remain / total) : 0;
  const colors = KIND_COLORS[current.kind] ?? KIND_COLORS['other']!;
  const barColor = current.kind === 'mtg' ? '#e07e4f' : colors.fg;

  const isActionable = current.status === 'pending' || current.status === 'active';

  root.innerHTML = `
    <div class="pip-task">${current.kind === 'mtg' ? '\u{1F5E3}\uFE0F ' : ''}${current.task}</div>
    <div class="pip-time">残り ${remain}分</div>
    <div class="pip-bar"><div class="pip-fill" style="width:${Math.min(progress * 100, 100)}%; background:${barColor}"></div></div>
    ${isActionable ? `
    <div class="pip-actions">
      <button class="pip-btn complete" data-action="complete">\u2713 完了</button>
      <button class="pip-btn skip" data-action="skip">\u23ED スキップ</button>
    </div>` : ''}
  `;
}

export function setupPip(
  btn: HTMLButtonElement,
  getBlocks: () => ScheduleBlock[],
  onAction: (action: string, task: string) => Promise<void>,
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
        width: 380,
        height: 130,
      });
    } catch (e) {
      console.error('PiP error:', e);
      return;
    }

    pipWindow.document.head.innerHTML = `<style>${PIP_STYLES}</style>`;
    pipWindow.document.body.innerHTML = '<div id="pip-root"></div>';

    pipWindow.document.body.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset['action'];
      if (action) {
        const blocks = getBlocks();
        const nowMin = getNowMin();
        const current = blocks.find(
          b => nowMin >= timeToMin(b.start) && nowMin < timeToMin(b.end),
        );
        if (current) {
          await onAction(action, current.task);
          updatePipContent(pipWindow!, getBlocks);
        }
      }
    });

    btn.classList.add('active');
    btn.textContent = 'PiP ON';

    updatePipContent(pipWindow, getBlocks);
    pipInterval = setInterval(() => {
      if (!pipWindow || pipWindow.closed) {
        closePip();
        return;
      }
      updatePipContent(pipWindow, getBlocks);
    }, 1000);

    pipWindow.addEventListener('pagehide', () => closePip());
  });
}
