/** Nhãn màu kiểu Trello dùng cho công việc (Task) */
export type TaskLabelDef = {
  name: string;
  chip: string; // badge hiển thị
  dot: string; // chấm màu
};

export const TASK_LABELS: TaskLabelDef[] = [
  { name: "Marketing", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
  { name: "Content", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  { name: "Design", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  { name: "Sales", chip: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
  { name: "Support", chip: "bg-[#1b98e0]/15 text-violet-300 border-[#1b98e0]/30", dot: "bg-violet-400" },
];

export function labelDefOf(name?: string | null): TaskLabelDef | undefined {
  return TASK_LABELS.find((l) => l.name === name);
}
