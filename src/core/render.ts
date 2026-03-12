import type { Schedule } from './schedule';

/** Schedule → 完全な HTML 文字列を返す純粋関数 */
export function renderHtml(schedule: Schedule): string {
  const scheduleJson = JSON.stringify(
    schedule.blocks.map(b => ({
      start: b.start,
      end: b.end,
      task: b.task,
      kind: b.kind,
      status: b.status,
    })),
  );

  const title = `${schedule.date} スケジュール`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    padding: 24px;
    min-height: 100vh;
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #fff;
  }

  .clock {
    font-size: 14px;
    color: #888;
    margin-bottom: 20px;
    font-variant-numeric: tabular-nums;
  }

  .timeline {
    position: relative;
    margin-left: 64px;
    border-left: 2px solid #2a2a2a;
  }

  .block {
    position: relative;
    margin-left: 16px;
    margin-bottom: 1px;
    border-radius: 6px;
    padding: 6px 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    transition: background 0.3s, border-color 0.3s;
    border: 1px solid transparent;
    overflow: hidden;
  }

  .block .time-label {
    font-size: 11px;
    color: #888;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .block .task-name {
    flex: 1;
    font-size: 13px;
    line-height: 1.4;
    min-width: 0;
  }

  .block .duration {
    font-size: 11px;
    color: #888;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .block .kind-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .block[data-kind="他人影響"] { background: #1a1a2e; }
  .block[data-kind="他人影響"] .kind-badge { background: #2d2b55; color: #a89edb; }

  .block[data-kind="思考系"] { background: #1a2420; }
  .block[data-kind="思考系"] .kind-badge { background: #1e3a2f; color: #7ecba1; }

  .block[data-kind="作業系"] { background: #1a2030; }
  .block[data-kind="作業系"] .kind-badge { background: #1e2d4a; color: #7eb3e0; }

  .block[data-kind="MTG"] { background: #2a1a1a; }
  .block[data-kind="MTG"] .kind-badge { background: #3a1e1e; color: #e0a07e; }

  .block[data-kind="-"] { background: #1a1a1a; }
  .block[data-kind="-"] .task-name { color: #666; }
  .block[data-kind="-"] .kind-badge { display: none; }

  .block.current {
    border-color: #ff4444;
    box-shadow: 0 0 12px rgba(255, 68, 68, 0.15);
  }

  .block.current::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #ff4444;
    border-radius: 3px 0 0 3px;
  }

  .block.past {
    opacity: 0.4;
  }

  .block.completed .task-name {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .now-line {
    position: absolute;
    left: -8px;
    right: 0;
    height: 2px;
    background: #ff4444;
    z-index: 10;
    pointer-events: none;
    transition: top 0.5s ease;
  }

  .now-line::before {
    content: "";
    position: absolute;
    left: -4px;
    top: -4px;
    width: 10px;
    height: 10px;
    background: #ff4444;
    border-radius: 50%;
  }

  .end-time {
    position: absolute;
    left: -78px;
    bottom: 2px;
    font-size: 11px;
    color: #444;
    font-variant-numeric: tabular-nums;
  }

  .hour-line {
    position: absolute;
    left: -60px;
    right: 0;
    height: 1px;
    border-top: 1px dashed #333;
    pointer-events: none;
    z-index: 1;
  }

  .hour-line .hour-label {
    position: absolute;
    left: -2px;
    top: -8px;
    font-size: 11px;
    font-weight: 600;
    color: #555;
    font-variant-numeric: tabular-nums;
  }

  .legend {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #888;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .debug-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border-top: 1px solid #333;
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 100;
    font-size: 12px;
  }

  .debug-bar label {
    color: #888;
    white-space: nowrap;
  }

  .debug-bar input[type="range"] {
    flex: 1;
    accent-color: #ff4444;
  }

  .debug-bar .debug-time {
    color: #ff4444;
    font-variant-numeric: tabular-nums;
    min-width: 40px;
  }

  .debug-bar button {
    background: #333;
    color: #ccc;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 2px 10px;
    cursor: pointer;
    font-size: 11px;
  }

  .debug-bar button:hover { background: #444; }
  .debug-bar button.active { background: #ff4444; color: #fff; border-color: #ff4444; }
</style>
</head>
<body>

<h1>${escapeHtml(title)}</h1>
<div class="clock" id="clock"></div>

<div class="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#2d2b55"></div>他人影響</div>
  <div class="legend-item"><div class="legend-dot" style="background:#1e3a2f"></div>思考系</div>
  <div class="legend-item"><div class="legend-dot" style="background:#1e2d4a"></div>作業系</div>
  <div class="legend-item"><div class="legend-dot" style="background:#3a1e1e"></div>MTG</div>
</div>

<div class="timeline" id="timeline"></div>

<div class="debug-bar" id="debugBar" style="display:none">
  <label>シミュレート:</label>
  <input type="range" id="timeSlider" min="0" max="1440" value="780" step="1">
  <span class="debug-time" id="debugTime">13:00</span>
  <button id="toggleBtn">リアルタイム</button>
</div>

<script>
const SCHEDULE = ${scheduleJson};

const PX_PER_MIN = 5.5;
const DEBUG = new URLSearchParams(location.search).has("debug");
let useSimulatedTime = DEBUG;

if (DEBUG) document.getElementById("debugBar").style.display = "flex";

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const slider = document.getElementById("timeSlider");
const debugTimeEl = document.getElementById("debugTime");
const toggleBtn = document.getElementById("toggleBtn");

function updateSliderLabel() {
  const v = parseInt(slider.value);
  const h = Math.floor(v / 60);
  const m = v % 60;
  debugTimeEl.textContent = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
}

slider.addEventListener("input", () => {
  useSimulatedTime = true;
  toggleBtn.classList.remove("active");
  updateSliderLabel();
  render();
});

toggleBtn.addEventListener("click", () => {
  useSimulatedTime = !useSimulatedTime;
  toggleBtn.classList.toggle("active", !useSimulatedTime);
  toggleBtn.textContent = useSimulatedTime ? "リアルタイム" : "リアルタイム中";
  render();
});

if (DEBUG) {
  slider.value = 780;
  updateSliderLabel();
}

function render() {
  const timeline = document.getElementById("timeline");
  const now = new Date();
  const nowMin = useSimulatedTime ? parseInt(slider.value) : (now.getHours() * 60 + now.getMinutes());

  timeline.innerHTML = "";

  if (SCHEDULE.length === 0) return;

  const dayStart = timeToMin(SCHEDULE[0].start);
  const dayEnd = timeToMin(SCHEDULE[SCHEDULE.length - 1].end);
  const totalHeight = (dayEnd - dayStart) * PX_PER_MIN;
  timeline.style.height = totalHeight + "px";
  timeline.style.position = "relative";

  const firstHour = Math.ceil(dayStart / 60);
  const lastHour = Math.floor(dayEnd / 60);
  for (let h = firstHour; h <= lastHour; h++) {
    const hMin = h * 60;
    const line = document.createElement("div");
    line.className = "hour-line";
    line.style.top = ((hMin - dayStart) * PX_PER_MIN) + "px";
    const label = document.createElement("span");
    label.className = "hour-label";
    label.textContent = h + ":00";
    line.appendChild(label);
    timeline.appendChild(line);
  }

  SCHEDULE.forEach((item) => {
    const startMin = timeToMin(item.start);
    const endMin = timeToMin(item.end);
    const dur = endMin - startMin;
    const top = (startMin - dayStart) * PX_PER_MIN;
    const height = dur * PX_PER_MIN;

    const block = document.createElement("div");
    block.className = "block";
    block.dataset.kind = item.kind;
    block.style.position = "absolute";
    block.style.top = top + "px";
    block.style.height = height + "px";
    block.style.left = "16px";
    block.style.right = "0";

    if (nowMin >= startMin && nowMin < endMin) {
      block.classList.add("current");
    } else if (nowMin >= endMin) {
      block.classList.add("past");
    }

    if (item.status === "completed") {
      block.classList.add("completed");
    }

    const timeLabel = document.createElement("span");
    timeLabel.className = "time-label";
    timeLabel.textContent = item.start + "-" + item.end;
    block.appendChild(timeLabel);

    const taskName = document.createElement("span");
    taskName.className = "task-name";
    taskName.textContent = item.task;
    block.appendChild(taskName);

    if (item.kind !== "-") {
      const badge = document.createElement("span");
      badge.className = "kind-badge";
      badge.textContent = item.kind;
      block.appendChild(badge);
    }

    const duration = document.createElement("span");
    duration.className = "duration";
    duration.textContent = dur + "m";
    block.appendChild(duration);

    timeline.appendChild(block);
  });

  if (nowMin >= dayStart && nowMin <= dayEnd) {
    const nowLine = document.createElement("div");
    nowLine.className = "now-line";
    nowLine.style.top = ((nowMin - dayStart) * PX_PER_MIN) + "px";
    timeline.appendChild(nowLine);
  }

  const pad = n => String(n).padStart(2, "0");
  const displayH = Math.floor(nowMin / 60);
  const displayM = nowMin % 60;
  document.getElementById("clock").textContent =
    (useSimulatedTime ? "SIM " : "") + "現在 " + pad(displayH) + ":" + pad(displayM) + " — " +
    (() => {
      const current = SCHEDULE.find(s => nowMin >= timeToMin(s.start) && nowMin < timeToMin(s.end));
      if (current) return current.task;
      if (nowMin < timeToMin(SCHEDULE[0].start)) return "勤務開始前";
      if (nowMin >= timeToMin(SCHEDULE[SCHEDULE.length - 1].end)) return "お疲れさまでした";
      return "スロット間";
    })();
}

render();
setInterval(render, 60000);
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
