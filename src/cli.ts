#!/usr/bin/env bun

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const filteredArgs = args.filter(a => a !== '--json');
const command = filteredArgs[0];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main(): Promise<void> {
  switch (command) {
    case 'set': {
      const date = filteredArgs[1];
      if (!date)
        throw new Error('Usage: dayplan set <YYYY-MM-DD> (pipe JSON to stdin)');
      const { setCommand } = await import('./commands/set');
      await setCommand(date, jsonFlag);
      break;
    }
    case 'show': {
      const date = filteredArgs[1] ?? today();
      const { showCommand } = await import('./commands/show');
      await showCommand(date, jsonFlag);
      break;
    }
    case 'status': {
      const date = filteredArgs[1] ?? today();
      const { statusCommand } = await import('./commands/status');
      await statusCommand(date, jsonFlag);
      break;
    }
    case 'add': {
      const date = filteredArgs[1];
      if (!date)
        throw new Error(
          'Usage: dayplan add <YYYY-MM-DD> (pipe block JSON to stdin)',
        );
      const { addCommand } = await import('./commands/add');
      await addCommand(date, jsonFlag);
      break;
    }
    case 'complete': {
      const date = filteredArgs[1];
      const task = filteredArgs[2];
      if (!date || !task)
        throw new Error('Usage: dayplan complete <YYYY-MM-DD> <task-name>');
      const { completeCommand } = await import('./commands/complete');
      await completeCommand(date, task, jsonFlag);
      break;
    }
    case 'remove': {
      const date = filteredArgs[1];
      const task = filteredArgs[2];
      if (!date || !task)
        throw new Error('Usage: dayplan remove <YYYY-MM-DD> <task-name>');
      const { removeCommand } = await import('./commands/remove');
      await removeCommand(date, task, jsonFlag);
      break;
    }
    case 'render': {
      const date = filteredArgs[1] ?? today();
      const { renderCommand } = await import('./commands/render');
      await renderCommand(date, jsonFlag);
      break;
    }
    case 'notify': {
      const clearFlag = filteredArgs.includes('--clear');
      const date =
        filteredArgs.find(a => a !== '--clear' && a !== 'notify') ?? today();
      const { notifyCommand } = await import('./commands/notify');
      await notifyCommand(date, clearFlag, jsonFlag);
      break;
    }
    case 'prime': {
      const { primeCommand } = await import('./commands/prime');
      primeCommand();
      break;
    }
    case 'onboard': {
      const { onboardCommand } = await import('./commands/onboard');
      onboardCommand();
      break;
    }
    case 'help':
    case undefined: {
      printHelp();
      break;
    }
    default:
      console.error(`Unknown command: "${command}". Run: dayplan help`);
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`dayplan — Daily schedule management CLI

Usage:
  dayplan set <date>              Set schedule (pipe JSON to stdin)
  dayplan show [date]             Show schedule (default: today)
  dayplan status [date]           Current task & remaining time
  dayplan add <date>              Add a block (pipe JSON to stdin)
  dayplan complete <date> <task>  Mark task as completed
  dayplan remove <date> <task>    Remove a task
  dayplan render [date]           Generate HTML timeline + open
  dayplan notify [date]           Register macOS notifications
  dayplan notify --clear          Clear notifications
  dayplan prime                   AI context output
  dayplan onboard                 Snippet for AGENTS.md
  dayplan help                    This help

Options:
  --json    Machine-readable JSON output`);
}

main().catch((err: Error) => {
  if (jsonFlag) {
    console.error(JSON.stringify({ error: err.message }));
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});
