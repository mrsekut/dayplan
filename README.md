# dayplan

CLI tool for AI-driven daily schedule management. Manages time blocks as JSON, renders HTML timelines, and sends macOS notifications.

## Data Model

```typescript
type TaskKind = '他人影響' | '思考系' | '作業系' | 'MTG' | '-';
type BlockStatus = 'pending' | 'completed';

type TimeBlock = {
  start: string; // "HH:MM" (24h)
  end: string; // "HH:MM" (24h)
  task: string;
  kind: TaskKind; // defaults to '-'
  status: BlockStatus; // defaults to 'pending'
};

type Schedule = {
  date: string; // "YYYY-MM-DD"
  blocks: TimeBlock[];
};
```

## Storage

Schedules are persisted as JSON files at `~/.config/dayplan/<YYYY-MM-DD>.json`.

## Commands

All commands support `--json` for machine-readable output.

### Schedule Management

```bash
# Set a full schedule (pipe JSON to stdin)
echo '{"date":"2025-07-10","blocks":[...]}' | dayplan set 2025-07-10

# Show schedule as a formatted table
dayplan show [date]

# Show current task and remaining time
dayplan status [date]

# Add a single block (pipe JSON to stdin)
echo '{"start":"10:00","end":"10:30","task":"foo","kind":"作業系"}' | dayplan add 2025-07-10

# Mark a task as completed
dayplan complete 2025-07-10 "task name"

# Remove a task
dayplan remove 2025-07-10 "task name"
```

### Visualization & Notifications

```bash
# Generate and open an interactive HTML timeline in the browser
dayplan render [date]

# Register macOS notifications (5 min before each task ends)
dayplan notify [date]

# Clear registered notifications
dayplan notify --clear
```

### AI Integration

```bash
# Output full context for AI agents (data model, examples, workflow)
dayplan prime

# Output a short snippet for AGENTS.md / skill files
dayplan onboard
```

## Architecture

```
src/
├── cli.ts              # Entry point, argv routing
├── storage.ts          # Load/save JSON files via Bun.file()
├── commands/
│   ├── set.ts          # Pipe full schedule JSON
│   ├── show.ts         # Terminal table display
│   ├── status.ts       # Current task info
│   ├── add.ts          # Append a single block
│   ├── complete.ts     # Mark task completed
│   ├── remove.ts       # Delete a task
│   ├── render.ts       # HTML timeline generation + browser open
│   ├── notify.ts       # macOS notification via launchd
│   ├── prime.ts        # AI context output
│   └── onboard.ts      # AI snippet output
└── core/
    ├── schedule.ts     # Types, validation, pure transforms
    ├── format.ts       # Terminal formatting (table, status)
    ├── render.ts       # HTML/CSS/JS generation (dark theme, real-time)
    └── notify.ts       # Notification point calc, shell script gen
```

Core modules (`src/core/`) are pure functions with no side effects. Commands (`src/commands/`) handle I/O and orchestration.

## Setup

```bash
bun install
bun link     # makes 'dayplan' available globally
```

## Testing

```bash
bun test
```

Test files are in `test/core/` covering schedule logic, formatting, rendering, and notifications.
