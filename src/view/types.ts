export type TaskKind = '他人影響' | '思考系' | '作業系' | 'MTG' | '-';
export type BlockStatus = 'pending' | 'completed';

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
  subtasks?: SubTask[];
};

export type ScheduleData = {
  date: string;
  title: string;
  blocks: ScheduleBlock[];
};
