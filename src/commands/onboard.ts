export function onboardCommand(): void {
  const output = `## dayplan CLI

Schedule management CLI for AI-driven daily planning.

### Quick Start
\`\`\`bash
# Get full AI context
dayplan prime

# Set today's schedule
echo '<schedule-json>' | dayplan set $(date +%Y-%m-%d)

# View schedule
dayplan show

# Current task
dayplan status
\`\`\`

### Key Points
- AI builds JSON, dayplan persists and renders
- All commands support \`--json\` for structured output
- Data stored in \`~/.config/dayplan/\`
- Run \`dayplan prime\` for full command reference
`;
  console.log(output);
}
