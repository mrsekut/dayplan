export type TaskKind = 'focus' | 'batch' | 'mtg' | 'other';
export type BlockStatus = 'pending' | 'active' | 'completed' | 'skipped';

export type SubTask = {
  title: string;
  done: boolean;
};

export type ScheduleBlock = {
  start: string;
  end: string;
  task: string;
  kind: TaskKind;
  status: BlockStatus;
  beadId?: string;
  subtasks?: SubTask[];
};

export type ScheduleData = {
  date: string;
  title: string;
  blocks: ScheduleBlock[];
};
