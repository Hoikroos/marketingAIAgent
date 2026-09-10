"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";

const STATUSES = ["Chờ thực hiện", "Đang thực hiện", "Đã hoàn thành"];
const META: Record<string, { border: string; bg: string; text: string }> = {
  "Chờ thực hiện": { border: "#fb7185", bg: "rgba(251,113,133,0.12)", text: "text-rose-300" },     // đỏ
  "Đang thực hiện": { border: "#fb923c", bg: "rgba(251,146,60,0.12)", text: "text-orange-300" },   // cam
  "Đã hoàn thành": { border: "#34d399", bg: "rgba(52,211,153,0.12)", text: "text-emerald-300" },   // xanh lá
};

export default function TaskStatusSelect({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Cập nhật thất bại");
      toast.success("Đã cập nhật công việc", next);
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể cập nhật", err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const meta = META[status] || { border: "var(--border)", bg: "transparent", text: "text-slate-300" };

  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      style={{ borderColor: meta.border, backgroundColor: meta.bg }}
      className={`input appearance-none !w-auto !py-1.5 !pl-2.5 text-xs font-semibold cursor-pointer ${meta.text} disabled:opacity-50`}
      title="Cập nhật trạng thái làm việc"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
