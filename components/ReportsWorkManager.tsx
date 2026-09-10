"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useToast } from "./toast";
import { Field, Status, Spinner, EmptyState } from "./ui";
import { Plus, Download, Trash2, Upload, ClipboardList, Eye, X, ChevronDown, User, Search, FileCheck2, FileClock, Users } from "./icons";
import Swal from "sweetalert2";

type Emp = { id: number; name: string; avatar?: string | null };
type Rep = {
  id: number;
  title: string;
  period: string;
  periodLabel: string;
  status: string;
  fileName?: string | null;
  filePath?: string | null;
  submittedAt?: string | null;
  employee?: Emp | null;
};

export default function ReportsWorkManager({
  isAdmin,
  canUpload = true,
  canDownload = true,
  canDelete = true,
  currentUserId,
}: {
  isAdmin: boolean;
  canUpload?: boolean;
  canDownload?: boolean;
  canDelete?: boolean;
  currentUserId?: number;
}) {
  const toast = useToast();
  const sp = useSearchParams();
  const focusId = sp.get("focus");
  const [reports, setReports] = useState<Rep[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ id: number; title: string; fileName?: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPars, setPreviewPars] = useState<string[] | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("week");
  const [periodLabel, setPeriodLabel] = useState("");
  const [selEmp, setSelEmp] = useState<number[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const res = await fetch("/api/work-reports");
      const d = await res.json();
      if (d.ok) {
        setReports(d.reports || []);
        setEmployees(d.employees || []);
      }
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Khi URL có ?focus={id} (click từ thông báo báo cáo) → tự mở nhóm chứa báo cáo đó
  useEffect(() => {
    if (!focusId) return;
    const target = reports.find((r) => String(r.id) === focusId);
    if (!target) return;
    const gkey = `${target.periodLabel}__${target.title}`;
    setCollapsed((prev) => {
      if (!prev.has(gkey)) return prev;
      const nxt = new Set(prev);
      nxt.delete(gkey);
      return nxt;
    });
  }, [focusId, reports]);

  // Cuộn tới & làm nổi bật dòng báo cáo được focus (sau khi nhóm mở + DOM render)
  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`report-row-${focusId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-focus");
      setTimeout(() => el.classList.remove("row-focus"), 3500);
    }, 150);
    return () => clearTimeout(timer);
  }, [focusId, reports, collapsed]);

  function openCreateForm() {
    setTitle(""); setPeriod("week"); setPeriodLabel(""); setSelEmp([]);
    setShowCreate(true);
  }
  function closeCreateForm() {
    setShowCreate(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (selEmp.length === 0) {
      toast.error("Chưa chọn nhân viên", "Hãy chọn ít nhất 1 nhân viên.");
      return;
    }
    try {
      const res = await fetch("/api/work-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, period, periodLabel, employeeIds: selEmp }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Tạo thất bại");
      toast.success("Đã giao báo cáo", `${d.count} nhân viên`);
      closeCreateForm();
      setTitle(""); setPeriod("week"); setPeriodLabel(""); setSelEmp([]);
      await load();
    } catch (err: any) { toast.error("Tạo thất bại", err.message || String(err)); }
  }

  async function uploadFile(id: number, file?: File) {
    if (!file) return;
    setUploadingId(id);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/work-reports/${id}/upload`, { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Nộp thất bại");
      toast.success("Đã nộp báo cáo");
      await load();
    } catch (err: any) {
      toast.error("Nộp thất bại", err.message || String(err));
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteFile(id: number) {
    const result = await Swal.fire({
      title: "Xoá file?",
      text: "Bạn có chắc muốn xoá file này? Bạn sẽ phải nộp lại.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/work-reports/${id}/file`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá thất bại");
      toast.success("Đã xoá file", "Bạn có thể nộp lại file mới.");
      await load();
    } catch (err: any) {
      toast.error("Xoá thất bại", err.message || String(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function viewFile(r: Rep) {
    setPreview({ id: r.id, title: r.title, fileName: r.fileName });
    setPreviewLoading(true);
    setPreviewPars(null);
    setPreviewMsg(null);
    try {
      const res = await fetch(`/api/work-reports/${r.id}/preview`);
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không xem được nội dung");
      if (Array.isArray(d.paragraphs) && d.paragraphs.length) setPreviewPars(d.paragraphs);
      else setPreviewMsg(d.message || "File này không có nội dung văn bản để hiển thị.");
    } catch (err: any) {
      setPreviewMsg(err.message || String(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  // Bộ lọc tìm kiếm + trạng thái
  const visibleReports = useMemo(() => {
    const query = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (fStatus && r.status !== fStatus) return false;
      if (!query) return true;
      return `${r.title} ${r.periodLabel} ${r.employee?.name || ""}`.toLowerCase().includes(query);
    });
  }, [q, fStatus, reports]);

  // Nhóm các báo cáo đã giao cùng một lần (cùng kỳ + cùng tiêu đề) thành 1 nhóm
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; periodLabel: string; items: Rep[] }>();
    const order: string[] = [];
    for (const r of visibleReports) {
      const key = `${r.periodLabel}__${r.title}`;
      if (!map.has(key)) {
        map.set(key, { key, title: r.title, periodLabel: r.periodLabel, items: [] });
        order.push(key);
      }
      map.get(key)!.items.push(r);
    }
    return order.map((k) => map.get(k)!);
  }, [visibleReports]);

  function isCollapsed(key: string) {
    return collapsed.has(key);
  }
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const nxt = new Set(prev);
      if (nxt.has(key)) nxt.delete(key);
      else nxt.add(key);
      return nxt;
    });
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-20 skeleton" />)}
        </div>
        <div className="card p-5 h-14 skeleton" />
        <div className="card p-5 h-24 skeleton" />
        <div className="card p-5 h-24 skeleton" />
      </div>
    );
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/work-reports/export");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Xuất Excel thất bại");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";]+)"?/);
      a.download = match ? match[1] : `bao-cao-tong-hop-cong-viec-${Date.now()}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã xuất Excel", "Báo cáo tổng hợp có bảng màu đã được tải xuống.");
    } catch (err: any) {
      toast.error("Xuất Excel thất bại", err.message || String(err));
    } finally {
      setExporting(false);
    }
  }

  const totalItems = reports.length;
  const totalSubmitted = reports.filter((r) => r.status === "Đã nộp").length;
  const totalPending = totalItems - totalSubmitted;
  const groupCount = groups.length;

  return (
    <div className="space-y-6">
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1b98e0]/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tổng lượt giao</div>
              <div className="text-2xl font-black mt-1 text-[#1b98e0]">{totalItems}</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#1b98e0]/10 grid place-items-center text-[#1b98e0] shrink-0">
              <ClipboardList size={16} />
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-400/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Đã nộp</div>
              <div className="text-2xl font-black mt-1 text-emerald-400">{totalSubmitted}</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-400/10 grid place-items-center text-emerald-400 shrink-0">
              <FileCheck2 size={16} />
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden p-4 animate-in">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-400/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Chưa nộp</div>
              <div className="text-2xl font-black mt-1 text-amber-400">{totalPending}</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-400/10 grid place-items-center text-amber-400 shrink-0">
              <FileClock size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Header / summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users size={13} className="text-[#1b98e0]" />
          <span>{groupCount} đợt báo cáo đã giao</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="btn-ghost text-xs rounded-xl"
            type="button"
            title="Xuất báo cáo tổng hợp ra file Excel"
          >
            {exporting ? <Spinner size={13} /> : <Download size={13} />}
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          {isAdmin && (
            <button onClick={openCreateForm} className="btn-primary text-xs rounded-xl" type="button">
              <Plus size={15} /> Giao báo cáo mới
            </button>
          )}
        </div>
      </div>

      {/* Bộ lọc tìm kiếm */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 focus-within:border-[#1b98e0]/50 transition-colors">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            className="bg-transparent outline-none text-xs w-full py-2.5"
            placeholder="Tìm theo tiêu đề, kỳ, nhân viên..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="text-slate-500 hover:text-slate-300 shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="input !w-auto !py-2.5 text-xs rounded-xl">
          <option value="">Tất cả trạng thái</option>
          <option>Chưa nộp</option>
          <option>Đã nộp</option>
        </select>
      </div>

      {/* @list@ */}
      {groups.length === 0 ? (
        <EmptyState
          title={isAdmin ? "Chưa có báo cáo nào" : "Bạn chưa có báo cáo được giao"}
          desc={isAdmin ? "Bấm 'Giao báo cáo mới' để tạo báo cáo tuần/tháng cho nhân viên." : "Quản trị viên sẽ giao báo cáo cho bạn khi đến hạn."}
        />
      ) : (
        <div className="space-y-3.5">
          {groups.map((g) => {
            const open = !isCollapsed(g.key);
            const submitted = g.items.filter((r) => r.status === "Đã nộp").length;
            const pct = g.items.length ? Math.round((submitted / g.items.length) * 100) : 0;
            const complete = submitted === g.items.length;
            const names = g.items.map((i) => i.employee?.name).filter(Boolean).join(", ");
            return (
              <div key={g.key} className="card overflow-hidden border border-[var(--border-soft)] transition-shadow hover:shadow-md">
                <button
                  onClick={() => toggleGroup(g.key)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--panel2)] transition"
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${complete ? "bg-emerald-400/12 text-emerald-400" : "bg-amber-400/12 text-amber-400"}`}>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm truncate">Báo cáo {g.periodLabel}</div>
                      <div className="text-[11px] text-slate-400 truncate">{g.title} • gồm: {names}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                        complete ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {submitted}/{g.items.length} đã nộp
                    </span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-[var(--border-soft)]">
                    {/* Table view — sm and up */}
                    <div className="hidden sm:block px-4 pb-4 pt-1 overflow-auto">
                      <table className="w-full text-left text-xs data-table">
                        <thead>
                          <tr>
                            <th className="p-3">Nhân viên</th>
                            <th>Trạng thái</th>
                            <th>Ngày nộp</th>
                            <th>File / Nộp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((r) => (
                            <tr key={r.id} id={`report-row-${r.id}`} className="scroll-mt-24">
                              <td className="p-3">
                                <div className="flex items-center gap-2 font-bold whitespace-nowrap">
                                  {r.employee?.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={r.employee.avatar} alt={r.employee.name} className="w-6 h-6 rounded-full shrink-0 object-cover" />
                                  ) : (
                                    <span className="w-6 h-6 rounded-full bg-[#1b98e0] text-white flex items-center justify-center shrink-0">
                                      <User size={12} />
                                    </span>
                                  )}
                                  {r.employee?.name || "—"}
                                </div>
                              </td>
                              <td>
                                <Status tone={r.status === "Đã nộp" ? "green" : "yellow"}>{r.status}</Status>
                              </td>
                              <td className="text-slate-500 whitespace-nowrap">
                                {r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "—"}
                              </td>
                              <td className="py-2">
                                <RowActions
                                  r={r}
                                  isAdmin={isAdmin}
                                  canDownload={canDownload}
                                  canDelete={canDelete}
                                  canUpload={canUpload}
                                  currentUserId={currentUserId}
                                  uploadingId={uploadingId}
                                  deletingId={deletingId}
                                  viewFile={viewFile}
                                  deleteFile={deleteFile}
                                  uploadFile={uploadFile}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Card view — below sm */}
                    <div className="sm:hidden divide-y divide-[var(--border-soft)]">
                      {g.items.map((r) => (
                        <div key={r.id} id={`report-row-${r.id}`} className="p-4 space-y-2.5 scroll-mt-24">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold text-xs min-w-0">
                              {r.employee?.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.employee.avatar} alt={r.employee.name} className="w-6 h-6 rounded-full shrink-0 object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-[#1b98e0] text-white flex items-center justify-center shrink-0">
                                  <User size={12} />
                                </span>
                              )}
                              <span className="truncate">{r.employee?.name || "—"}</span>
                            </div>
                            <Status tone={r.status === "Đã nộp" ? "green" : "yellow"}>{r.status}</Status>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "Chưa nộp"}
                          </div>
                          <RowActions
                            r={r}
                            isAdmin={isAdmin}
                            canDownload={canDownload}
                            canDelete={canDelete}
                            canUpload={canUpload}
                            currentUserId={currentUserId}
                            uploadingId={uploadingId}
                            deletingId={deletingId}
                            viewFile={viewFile}
                            deleteFile={deleteFile}
                            uploadFile={uploadFile}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="text-[10px] text-slate-500 px-1">
            Nhân viên nộp file Word (.doc/.docx) hoặc PDF. Khi đã nộp có thể <b>Xoá file</b> để nộp lại nếu tải nhầm.
          </div>
        </div>
      )}

      {/* Modal giao báo cáo mới */}
      {isAdmin && showCreate && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in"
          onClick={closeCreateForm}
        >
          <form
            onSubmit={create}
            className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-[var(--accent,#6366f1)]/15 text-[var(--accent,#6366f1)] grid place-items-center shrink-0">
                  <ClipboardList size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">Giao báo cáo mới</div>
                  <div className="text-[11px] text-slate-400 truncate">Tạo báo cáo tuần/tháng và giao cho nhân viên</div>
                </div>
              </div>
              <button onClick={closeCreateForm} className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Đóng">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid md:grid-cols-3 gap-3.5">
                <Field label="Tiêu đề *">
                  <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Báo cáo tuần 35/2026" />
                </Field>
                <Field label="Kỳ *">
                  <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="week">Theo tuần</option>
                    <option value="month">Theo tháng</option>
                  </select>
                </Field>
                <Field label="Nhãn kỳ *">
                  <input required className="input" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder={period === "week" ? "Tuần 35/2026" : "08/2026"} />
                </Field>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold">Giao cho nhân viên *</div>
                  {employees.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <button type="button" className="text-[var(--accent,#6366f1)] hover:underline" onClick={() => setSelEmp(employees.map((e) => e.id))}>
                        Chọn tất cả
                      </button>
                      <span className="text-slate-600">·</span>
                      <button type="button" className="text-slate-400 hover:underline" onClick={() => setSelEmp([])}>
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  {employees.map((em) => {
                    const checked = selEmp.includes(em.id);
                    return (
                      <label
                        key={em.id}
                        className={`flex items-center gap-2 text-[11px] cursor-pointer select-none rounded-lg border px-2.5 py-2 transition ${
                          checked
                            ? "border-[var(--accent,#6366f1)]/50 bg-[var(--accent,#6366f1)]/10"
                            : "border-[var(--border-soft)] hover:bg-[var(--panel2)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--accent,#6366f1)]"
                          checked={checked}
                          onChange={(e) => setSelEmp((arr) => (e.target.checked ? [...arr, em.id] : arr.filter((x) => x !== em.id)))}
                        />
                        {em.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={em.avatar} alt={em.name} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#1b98e0] text-white flex items-center justify-center shrink-0">
                            <User size={11} />
                          </span>
                        )}
                        <span className="truncate">{em.name}</span>
                      </label>
                    );
                  })}
                  {employees.length === 0 && <div className="text-[11px] text-slate-500">Không có nhân viên hoạt động.</div>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--border)] shrink-0">
              <span className="text-[11px] text-slate-500">{selEmp.length > 0 ? `${selEmp.length} nhân viên được chọn` : "Chưa chọn nhân viên"}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeCreateForm} className="btn-ghost text-xs rounded-xl">Huỷ</button>
                <button type="submit" className="btn-primary text-xs rounded-xl">Giao báo cáo</button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Modal xem trước nội dung file */}
      {preview && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in" onClick={() => setPreview(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div className="min-w-0 flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-[var(--accent,#6366f1)]/15 text-[var(--accent,#6366f1)] grid place-items-center shrink-0">
                  <Eye size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{preview.title}</div>
                  {preview.fileName && <div className="text-[11px] text-slate-400 truncate">{preview.fileName}</div>}
                </div>
              </div>
              <button onClick={() => setPreview(null)} className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Đóng">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-[var(--bg)] min-h-[180px]">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs"><Spinner size={13} /> Đang đọc nội dung file...</div>
              ) : previewPars ? (
                <div className="space-y-3 text-[13px] leading-relaxed text-[var(--text)]">
                  {previewPars.map((para, i) => (
                    <p key={i} className={para.startsWith("• ") ? "pl-4" : ""}>{para}</p>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-xs">{previewMsg}</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function RowActions({
  r,
  isAdmin,
  canDownload,
  canDelete,
  canUpload,
  currentUserId,
  uploadingId,
  deletingId,
  viewFile,
  deleteFile,
  uploadFile,
}: {
  r: Rep;
  isAdmin: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canUpload: boolean;
  currentUserId?: number;
  uploadingId: number | null;
  deletingId: number | null;
  viewFile: (r: Rep) => void;
  deleteFile: (id: number) => void;
  uploadFile: (id: number, file?: File) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {r.filePath && canDownload && (
        <button onClick={() => viewFile(r)} className="btn-ghost text-[10px] px-2 py-1.5 rounded-lg" type="button" title="Xem nội dung file">
          <Eye size={12} /> Xem
        </button>
      )}
      {r.filePath && canDownload && (
        <a href={`/api/work-reports/${r.id}/file`} download className="btn-ghost text-[10px] px-2 py-1.5 rounded-lg">
          <Download size={12} /> Tải về
        </a>
      )}
      {r.filePath && canDelete && (
        <button
          onClick={() => deleteFile(r.id)}
          disabled={deletingId === r.id}
          className="btn-ghost text-[10px] px-2 py-1.5 rounded-lg text-rose-400 disabled:opacity-50"
          type="button"
          title="Xoá file (nộp lại)"
        >
          {deletingId === r.id ? <Spinner size={12} /> : <Trash2 size={12} />}
        </button>
      )}
      {canUpload && (isAdmin || currentUserId === r.employee?.id) && (
        <label className="btn-ghost text-[10px] px-2 py-1.5 rounded-lg cursor-pointer">
          <Upload size={12} /> {r.filePath ? "Nộp lại" : "Nộp file"}
          <input
            type="file"
            accept=".doc,.docx,.pdf"
            className="hidden"
            onChange={(e) => uploadFile(r.id, e.target.files?.[0] || undefined)}
          />
        </label>
      )}
      {uploadingId === r.id && <Spinner size={13} />}
    </div>
  );
}