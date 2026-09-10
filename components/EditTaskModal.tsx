"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { Edit3, Trash2, UserRoundCheck, CalendarDays, Zap, Clock3, Save } from "./icons";
import { TASK_LABELS } from "./TaskLabels";
import Modal from "./Modal";
import Swal from "sweetalert2";

const STATUSES = ["Chờ thực hiện", "Đang thực hiện", "Đã hoàn thành"];
const PRIORITIES = ["Cao", "Trung bình", "Thấp"];

type Task = {
  id: number;
  title: string;
  assignee?: string | null;
  priority?: string;
  deadline?: string | null;
  assignedDate?: string | null;
  status: string;
  description?: string | null;
  label?: string | null;
};

function toDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Sửa / Xoá công việc — Sửa cần quyền team_update (hoặc Admin); Xoá chỉ Admin. */
export default function EditTaskModal({
  task,
  users,
  canEdit,
  canDelete,
}: {
  task: Task;
  users: string[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assignees, setAssignees] = useState<string[]>(() =>
    (task.assignee || "").split(" · ").map((s) => s.trim()).filter(Boolean)
  );
  const [priority, setPriority] = useState(task.priority || "Trung bình");
  const [deadline, setDeadline] = useState(toDate(task.deadline));
  const [assignedDate, setAssignedDate] = useState(toDate(task.assignedDate));
  const [status, setStatus] = useState(task.status);
  const [description, setDescription] = useState(task.description || "");
  const [label, setLabel] = useState(task.label || "");
  const [saving, setSaving] = useState(false);

  const inputCls = "input !py-2.5";
  const iconWrapCls = "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none";

  function toggleAssignee(nm: string) {
    setAssignees((prev) => (prev.includes(nm) ? prev.filter((x) => x !== nm) : [...prev, nm]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, title, assignee: assignees.join(" · "), priority, deadline: deadline || null, assignedDate: assignedDate || null, status, description, label }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Cập nhật thất bại");
      toast.success("Đã cập nhật công việc", title);
      router.refresh();
      setOpen(false);
    } catch (err: any) {
      toast.error("Không cập nhật được", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const r = await Swal.fire({
      title: "Xoá công việc?",
      text: `Bạn có chắc muốn xoá "${task.title}"? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá thất bại");
      toast.success("Đã xoá công việc", task.title);
      router.refresh();
      setOpen(false);
    } catch (err: any) {
      toast.error("Không xoá được công việc", err.message || String(err));
    }
  }

  return (
    <>
      {canEdit && (
        <button
          onClick={() => setOpen(true)}
          className="btn-ghost text-[11px] px-2.5 py-1.5"
          type="button"
          title="Sửa công việc"
        >
          <Edit3 size={13} /> Sửa
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Sửa công việc">
        <div className="mb-4 rounded-xl bg-[var(--panel2)] border border-[var(--border)] px-4 py-2.5 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide shrink-0">Đang sửa</span>
          <span className="text-sm font-bold truncate">{task.title}</span>
        </div>

        <form onSubmit={save} className="space-y-4">
          <Field label="Tên công việc *">
            <input required className={`${inputCls} font-semibold`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="Mô tả (tuỳ chọn)">
            <textarea rows={2} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết công việc..." />
          </Field>

          <Field label="Nhãn (tuỳ chọn)">
            <select className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="">Không nhãn</option>
              {TASK_LABELS.map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Giao cho (1 hoặc nhiều)">
              <div className="flex flex-wrap gap-1.5">
                {users.map((u) => {
                  const on = assignees.includes(u);
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => toggleAssignee(u)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                        on
                          ? "bg-[#1b98e0] border-[#1b98e0] text-white"
                          : "bg-[var(--panel2)] border-[var(--border)] text-slate-400"
                      }`}
                    >
                      {u}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Ưu tiên">
              <div className="relative">
                <select className={`${inputCls} pl-8`} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Ngày giao">
              <div className="relative">
                <input type="date" className={`${inputCls} pl-8`} value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
              </div>
            </Field>

            <Field label="Ngày hết hạn">
              <div className="relative">
                <input type="date" className={`${inputCls} pl-8`} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </Field>

            <Field label="Trạng thái">
              <div className="relative">
                <select className={`${inputCls} pl-8`} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Field>
          </div>

          <div className="flex gap-2 pt-3 border-t border-[var(--border-soft)]">
            {canDelete && (
              <button type="button" onClick={remove} className="btn-danger justify-center" title="Xoá công việc">
                <Trash2 size={14} /> Xoá
              </button>
            )}
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? <Spinner /> : <Save size={14} />} {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
