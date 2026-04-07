# dayplan

CLI tool for AI-driven daily schedule management. Manages time blocks as JSON, renders HTML timelines, and sends macOS notifications.

## Data Model

```typescript
type TaskKind = '他人影響' | '思考系' | '作業系' | 'MTG' | '-';
type BlockStatus = 'pending' | 'completed';

type SubTask = {
  title: string;
  done: boolean;
};

type TimeBlock = {
  start: string; // "HH:MM" (24h)
  end: string; // "HH:MM" (24h)
  task: string;
  kind: TaskKind; // defaults to '-'
  status: BlockStatus; // defaults to 'pending'
  subtasks?: SubTask[]; // optional sub-tasks within a block
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

### Interactive Web UI

```bash
# Start interactive web UI server (localhost:3456)
# Supports: block reordering, subtask management, task completion, carry-over to next day
dayplan serve [date]
```

### Visualization & Notifications

```bash
# Generate and open a static HTML timeline in the browser
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
