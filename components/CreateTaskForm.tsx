"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { User, UserPlus, X } from "./icons";
import { TASK_LABELS } from "./TaskLabels";

const FALLBACK_USERS: string[] = [];
const SEP = " · ";

const PRIORITY_DOT: Record<string, string> = {
  "Cao": "bg-rose-400",
  "Trung bình": "bg-amber-400",
  "Thấp": "bg-slate-400",
};

export default function CreateTaskForm({ onSuccess, users }: { onSuccess?: () => void; users?: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [assigned, setAssigned] = useState<string[]>(() => (users && users.length ? [users[0]] : []));
  const [priority, setPriority] = useState("Trung bình");
  const [deadline, setDeadline] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assigneeOptions = users && users.length ? users : FALLBACK_USERS;

  function toggle(nm: string) {
    setAssigned((prev) => (prev.includes(nm) ? prev.filter((x) => x !== nm) : [...prev, nm]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assignee: assigned.join(SEP), priority, deadline, assignedDate, description, label }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể giao việc");
      toast.success("Đã giao việc", `${title} → ${assigned.join(", ")}`);
      router.refresh();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || String(err);
      setError(msg);
      toast.error("Giao việc thất bại", msg);
    } finally {
      setLoading(false);
    }
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] shrink-0" />
        {children}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <SectionTitle>Công việc</SectionTitle>
        <Field label="Tên công việc *">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input !py-2.5 font-semibold"
            placeholder="VD: Viết kịch bản video mới"
          />
        </Field>
        <Field label="Mô tả (tuỳ chọn)">
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input !py-2.5"
            placeholder="Mô tả chi tiết công việc..."
          />
        </Field>
        <Field label="Nhãn (tuỳ chọn)">
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="input !py-2.5">
            <option value="">Không nhãn</option>
            {TASK_LABELS.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Giao cho</SectionTitle>
          <span className="text-[10px] text-slate-500">{assigned.length} người được chọn</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {assigneeOptions.map((nm) => {
            const on = assigned.includes(nm);
            return (
              <button
                key={nm}
                type="button"
                onClick={() => toggle(nm)}
                className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-[11px] font-bold border transition ${
                  on
                    ? "bg-[#1b98e0] border-[#1b98e0] text-white"
                    : "bg-[var(--panel2)] border-[var(--border)] text-slate-400 hover:border-[#1b98e0]/40"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-[#1b98e0] grid place-items-center text-white ${
                    on ? "ring-2 ring-white/40" : "opacity-80"
                  }`}
                >
                  <User size={11} />
                </span>
                {nm}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Ưu tiên &amp; thời hạn</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày giao">
            <input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} className="input !py-2.5" />
          </Field>
          <Field label="Ngày hết hạn">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input !py-2.5" />
          </Field>
          <Field label="Ưu tiên">
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${PRIORITY_DOT[priority] || "bg-slate-400"}`} />
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input !py-2.5 pl-7">
                <option>Cao</option>
                <option>Trung bình</option>
                <option>Thấp</option>
              </select>
            </div>
          </Field>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
          <X size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-[var(--border-soft)]">
        <button type="submit" className="btn-primary flex-1 justify-center mt-4" disabled={loading}>
          {loading ? <Spinner /> : <UserPlus size={15} />} {loading ? "Đang giao..." : "Giao việc"}
        </button>
      </div>
    </form>
  );
}