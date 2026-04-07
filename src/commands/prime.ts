export function primeCommand(): void {
  const output = `# dayplan CLI — AI Context

## Overview
dayplan manages daily schedules: data storage, terminal display, interactive web UI, and macOS notifications.
AI builds the schedule JSON, dayplan handles persistence and display.

## Commands

### Data Management
\`\`\`bash
# Set full schedule (pipe JSON to stdin)
echo '{"date":"2026-03-12","blocks":[{"start":"09:30","end":"10:00","task":"PRレビュー","kind":"他人影響","status":"pending"}]}' | dayplan set 2026-03-12

# Show schedule
dayplan show [date]          # defaults to today
dayplan show --json          # JSON output

# Current task & remaining time
dayplan status
dayplan status --json

# Add a single block
echo '{"start":"14:00","end":"14:30","task":"設計","kind":"思考系"}' | dayplan add 2026-03-12

# Complete a task
dayplan complete 2026-03-12 "PRレビュー"

# Remove a task
dayplan remove 2026-03-12 "PRレビュー"
\`\`\`

### Interactive Web UI
\`\`\`bash
dayplan serve [date]         # Start interactive web UI (localhost:3456)
                             # Block reordering, subtask management, completion, carry-over
\`\`\`

### Notifications
\`\`\`bash
dayplan notify [date]        # Register macOS notifications (5min before each task ends)
dayplan notify --clear       # Clear notifications
\`\`\`

### AI Integration
\`\`\`bash
dayplan prime                # This output
dayplan onboard              # Snippet for AGENTS.md / skill files
\`\`\`

All commands accept \`--json\` for machine-readable output.

## Data Model
\`\`\`typescript
type TaskKind = "他人影響" | "思考系" | "作業系" | "MTG" | "-";
type BlockStatus = "pending" | "completed";
type SubTask = { title: string; done: boolean };
type TimeBlock = { start: string; end: string; task: string; kind: TaskKind; status: BlockStatus; subtasks?: SubTask[] };
type Schedule = { date: string; blocks: TimeBlock[] };
\`\`\`

## Workflow

### Morning Planning
1. Gather calendar events (MCP), Linear issues, carry-over tasks
2. Build schedule JSON with AI logic
3. \`echo '<json>' | dayplan set <date>\`
4. \`dayplan serve\` to view/manage in browser
5. \`dayplan notify\` to set reminders

### During the Day
- Use \`dayplan serve\` for interactive management (reorder, subtasks, carry-over)
- Task done → \`dayplan complete <date> "<task>"\`
- Add ad-hoc → \`echo '<block>' | dayplan add <date>\`
- Remove cancelled → \`dayplan remove <date> "<task>"\`
- After changes → \`dayplan notify\` to refresh reminders

### Review
- \`dayplan show\` to see completion status
- \`dayplan show --json\` for data analysis

## Storage
Data: \`~/.config/dayplan/YYYY-MM-DD.json\`

## Error Handling
Errors include actionable hints. Example:
- "No schedule for 2026-03-12. Use: dayplan set 2026-03-12"
- "Task not found: \\"foo\\""
`;
  console.log(output);
}
