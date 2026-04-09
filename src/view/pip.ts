declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options: { width: number; height: number }): Promise<Window>;
    };
  }
}

type Entry = {
  type: string;
  start: string;
  end: string;
  title?: string;
  queue?: { title: string; status: string; estimatedMinutes: number }[];
};

type DayPlan = { date: string; entries: Entry[] } | null;

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
}

const PIP_STYLES = `
body { margin:0; padding:8px; background:#0d1117; color:#e6edf3; font-family:-apple-system,sans-serif; }
.pip-task { font-size:15px; font-weight:600; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pip-time { font-size:12px; color:#8b949e; margin-bottom:6px; }
.pip-bar { height:4px; background:#21262d; border-radius:2px; overflow:hidden; margin-bottom:8px; }
.pip-fill { height:100%; background:#58a6ff; transition:width 1s linear; }
.pip-actions { display:flex; gap:6px; }
.pip-btn { flex:1; padding:4px; border:1px solid #30363d; background:none; color:#e6edf3; border-radius:4px; cursor:pointer; font-size:12px; }
.pip-btn:hover { background:#30363d; }
.pip-btn.complete:hover { background:#238636; border-color:#238636; }
.pip-btn.skip:hover { background:#6e4000; border-color:#6e4000; }
`;

function getNowMin(): number {
  const timeParam = new URL(window.location.href).searchParams.get('time');
  if (timeParam) {
    const [h, m] = timeParam.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function updatePipContent(pw: Window, plan: DayPlan): void {
  if (!plan || pw.closed) return;
  const root = pw.document.getElementById('pip-root');
  if (!root) return;

  const nowMin = getNowMin();

  let slotRemain = 0;
  let activeTask: { title: string; estimatedMinutes: number } | null = null;
  let slotStart = 0;
  let slotEnd = 0;

  for (const e of plan.entries) {
    if (timeToMin(e.start) <= nowMin && nowMin < timeToMin(e.end)) {
      if (e.type === 'work' && e.queue) {
        slotRemain = timeToMin(e.end) - nowMin;
        slotStart = timeToMin(e.start);
        slotEnd = timeToMin(e.end);
        const t = e.queue.find(t => t.status === 'active');
        if (t) activeTask = t;
      } else if (e.type === 'fixed' && e.title) {
        activeTask = { title: e.title, estimatedMinutes: timeToMin(e.end) - timeToMin(e.start) };
        slotRemain = timeToMin(e.end) - nowMin;
        slotStart = timeToMin(e.start);
        slotEnd = timeToMin(e.end);
      }
      break;
    }
  }

  if (!activeTask) {
    root.innerHTML = '<div class="pip-task">タスクなし</div>';
    return;
  }

  const progress = slotEnd > slotStart ? (1 - slotRemain / (slotEnd - slotStart)) : 0;

  root.innerHTML = `
    <div class="pip-task">${activeTask.title}</div>
    <div class="pip-time">残り ${slotRemain}分 (作業枠)</div>
    <div class="pip-bar"><div class="pip-fill" style="width:${Math.min(progress * 100, 100)}%"></div></div>
    <div class="pip-actions">
      <button class="pip-btn complete" data-action="complete">✓ 完了</button>
      <button class="pip-btn skip" data-action="skip">⏭ スキップ</button>
    </div>
  `;
}

export function setupPip(
  btn: HTMLButtonElement,
  getPlan: () => DayPlan,
  onAction: (action: string) => Promise<void>,
): void {
  btn.addEventListener('click', async () => {
    if (!window.documentPictureInPicture) {
      alert('Document Picture-in-Picture is not supported in this browser');
      return;
    }

    const pw = await window.documentPictureInPicture.requestWindow({ width: 380, height: 130 });
    pw.document.head.innerHTML = `<style>${PIP_STYLES}</style>`;
    pw.document.body.innerHTML = '<div id="pip-root"></div>';

    pw.document.body.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset['action']) {
        await onAction(target.dataset['action']);
        updatePipContent(pw, getPlan());
      }
    });

    updatePipContent(pw, getPlan());

    const id = setInterval(() => {
      if (pw.closed) { clearInterval(id); return; }
      updatePipContent(pw, getPlan());
    }, 1000);
  });
}
