"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useToast } from "./toast";
import { Field, Spinner, EmptyState } from "./ui";
import { Save, Edit3, Trash2, CalendarDays, Search, Plus, X, Eye, FileText, Clock, User } from "./icons";
import Pagination from "./Pagination";
import Swal from "sweetalert2";

type Row = {
  id: number;
  userId: number;
  userName: string;
  date: string;
  tasksDone: string;
  note: string | null;
  updatedAt: string | Date;
};

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d}/${m}/${y}`;
}
function isToday(s: string) { return s === today(); }

export default function DailyReportManager({ viewAll, canWrite }: { viewAll: boolean; canWrite: boolean }) {
  const { data: session } = useSession();
  const currentUserId = session?.user ? Number((session.user as any).id) : undefined;
  const toast = useToast();
  const [reports, setReports] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [tasksDone, setTasksDone] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    fetch("/api/dailyreports")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setReports(d.reports || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreateForm() {
    setEditing(null); setDate(today()); setTasksDone(""); setNote("");
    setShowForm(true);
  }

  function startEdit(r: Row) {
    setEditing(r); setDate(r.date); setTasksDone(r.tasksDone); setNote(r.note || "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null); setTasksDone(""); setNote("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { date, tasksDone, note };
      const res = await fetch("/api/dailyreports", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Lưu thất bại");
      toast.success(editing ? "Đã cập nhật báo cáo" : "Đã lưu báo cáo");
      closeForm();
      load();
    } catch (err: any) {
      toast.error("Không lưu được", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Row) {
    const cf = await Swal.fire({
      title: "Xoá báo cáo?",
      text: `Xoá báo cáo ngày ${fmtDate(r.date)}? Không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      const res = await fetch(`/api/dailyreports?id=${r.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá thất bại");
      toast.success("Đã xoá báo cáo");
      load();
    } catch (err: any) {
      toast.error("Không xoá được", err.message || String(err));
    }
  }

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return query
      ? reports.filter((r) => `${r.userName} ${r.date} ${r.tasksDone} ${r.note || ""}`.toLowerCase().includes(query))
      : reports;
  }, [reports, query]);
  // Phân trang 10 dòng/trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  const myReportsCount = reports.filter((r) => r.userId === currentUserId).length;
  const todayDone = reports.some((r) => r.userId === currentUserId && isToday(r.date));
  const uniqueUsers = new Set(reports.map((r) => r.userId)).size;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-20 skeleton" />)}
        </div>
        <div className="card p-5 h-40 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-violet-400/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tổng báo cáo</div>
              <div className="text-2xl font-black mt-1 text-violet-400">{reports.length}</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-violet-400/10 grid place-items-center text-violet-400 shrink-0">
              <FileText size={16} />
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1b98e0]/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{viewAll ? "Của bạn" : "Của bạn"}</div>
              <div className="text-2xl font-black mt-1 text-[#1b98e0]">{myReportsCount}</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#1b98e0]/10 grid place-items-center text-[#1b98e0] shrink-0">
              <User size={16} />
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl ${todayDone ? "bg-emerald-400/10" : "bg-amber-400/10"}`} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hôm nay</div>
              <div className={`text-sm font-black mt-2 ${todayDone ? "text-emerald-400" : "text-amber-400"}`}>{todayDone ? "Đã báo cáo" : "Chưa báo cáo"}</div>
            </div>
            <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${todayDone ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
              <CalendarDays size={16} />
            </div>
          </div>
        </div>
      </div>

      {viewAll && (
        <div className="card p-3 text-xs text-slate-400 flex items-center gap-2">
          <Eye size={14} className="text-[#1b98e0] shrink-0" />
          Bạn có quyền xem báo cáo của <b className="text-slate-200">tất cả nhân viên</b> ({uniqueUsers} người). Chỉ bạn mới được sửa/xoá báo cáo của chính mình.
        </div>
      )}

      {/* Bộ lọc + nút thêm mới */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 focus-within:border-[#1b98e0]/50 transition-colors">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            className="bg-transparent outline-none text-xs w-full py-2.5"
            placeholder="Tìm theo tên, ngày, nội dung..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="text-slate-500 hover:text-slate-300 shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
        {canWrite ? (
          <button onClick={openCreateForm} className="btn-primary text-xs rounded-xl" type="button">
            <Plus size={15} /> Nhập báo cáo
          </button>
        ) : (
          <span className="text-[10px] text-slate-500">👁 Chế độ xem — không cần nhập báo cáo</span>
        )}
      </div>

      {/* Danh sách báo cáo */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FileText size={14} className="text-violet-400" />
            Danh sách báo cáo {viewAll ? "(tất cả nhân viên)" : "(của bạn)"}
          </h3>
          <span className="text-[11px] text-slate-500 shrink-0">{filtered.length} báo cáo</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState title={query ? "Không có báo cáo phù hợp" : "Chưa có báo cáo"} desc={query ? "Thử từ khoá khác." : "Bấm 'Nhập báo cáo' để tạo báo cáo đầu tiên."} />
          </div>
        ) : (
          <>
          <div className="divide-y divide-[var(--border-soft)]">
            {paged.map((r) => {
              const isOwner = currentUserId === r.userId;
              return (
                <div key={r.id} className="p-4 flex gap-3 hover:bg-[var(--bg-2)]/40 transition-colors">
                  <div className={`shrink-0 h-9 w-9 rounded-xl grid place-items-center text-[10px] font-black ${isToday(r.date) ? "bg-emerald-400/15 text-emerald-400" : "bg-violet-400/12 text-violet-400"}`}>
                    <CalendarDays size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold">{fmtDate(r.date)}</span>
                        {isToday(r.date) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-400/12 text-emerald-400">Hôm nay</span>}
                        {viewAll && <span className="text-[10px] text-slate-400 flex items-center gap-1"><User size={10} />{r.userName}</span>}
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Clock size={9} />{new Date(r.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(r)} className="h-6 w-6 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Sửa">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => remove(r)} className="h-6 w-6 grid place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors" type="button" title="Xoá">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{r.tasksDone}</p>
                    {r.note && (
                      <p className="text-[11px] text-slate-500 mt-1.5 rounded-lg bg-[var(--bg-2)] px-2.5 py-1.5 inline-block">📝 {r.note}</p>
                    )}
                    {!isOwner && <div className="text-[9px] text-slate-500 mt-1">Báo cáo của nhân viên khác — chỉ được xem.</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>

      {/* Modal nhập / sửa báo cáo */}
      {showForm && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in"
          onClick={closeForm}
        >
          <form
            onSubmit={save}
            className="w-full max-w-xl max-h-[88vh] flex flex-col bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-violet-400/15 text-violet-400 grid place-items-center shrink-0">
                  {editing ? <Edit3 size={16} /> : <CalendarDays size={16} />}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{editing ? `Sửa báo cáo ngày ${fmtDate(date)}` : "Nhập báo cáo công việc trong ngày"}</div>
                  <div className="text-[11px] text-slate-400 truncate">Ghi lại công việc đã hoàn thành hôm nay</div>
                </div>
              </div>
              <button onClick={closeForm} className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Đóng">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <Field label="Ngày">
                <input type="date" className="input w-full sm:w-52" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Công việc đã làm *">
                <textarea rows={4} className="input" value={tasksDone} onChange={(e) => setTasksDone(e.target.value)} placeholder="VD: Viết kịch bản video, gửi báo giá cho 5 khách..." required />
              </Field>
              <Field label="Ghi chú (tuỳ chọn)">
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Khó khăn / đề xuất..." />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)] shrink-0">
              <button type="button" onClick={closeForm} className="btn-ghost text-xs rounded-xl">Huỷ</button>
              <button type="submit" disabled={saving} className="btn-primary text-xs rounded-xl disabled:opacity-50">
                {saving ? <Spinner size={13} /> : <Save size={13} />} {saving ? "Đang lưu..." : editing ? "Cập nhật báo cáo" : "Lưu báo cáo"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}