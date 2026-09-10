"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./toast";
import { Status, Spinner } from "./ui";
import { Search, Trash2 } from "./icons";
import Pagination from "./Pagination";
import usePerm from "./usePerm";
import Swal from "sweetalert2";

type Lead = {
  id: number;
  name: string;
  phone: string;
  source: string;
  purpose?: string | null;
  address?: string | null;
  status: string;
  contacted: string;
  responseStatus: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  createdAt: string | Date;
  owner?: { id: number; name: string } | null;
};

const STATUSES = ["Mới", "Đang tư vấn", "Đã chốt", "Không tiềm năng"];
const SOURCES = ["Facebook", "Zalo", "TikTok", "Website", "YouTube"];
const CONTACTED_OPTIONS = ["Đã liên hệ", "Chưa liên hệ"];
const RESPONSE_STATUS_OPTIONS = ["Khách đã trả lời", "Đang chờ khách phản hồi", "Khách không nghe máy"];

function toneOf(status: string) {
  if (status === "Mới") return "green";
  if (status === "Đang tư vấn") return "yellow";
  if (status === "Đã chốt") return "purple";
  return "red";
}

// "2026-9" -> key duy nhất cho mỗi tháng
function monthKey(d: string | Date) {
  const date = new Date(d);
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `Tháng ${m}/${y}`;
}

export default function LeadsTable({ leads, users = [] }: { leads: Lead[]; users?: { id: number; name: string }[] }) {
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSource, setFSource] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const canUpdate = usePerm("leads_update");
  const canDelete = usePerm("leads_delete");
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  // Danh sách các tháng có dữ liệu, mới nhất trước
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) set.add(monthKey(l.createdAt));
    return Array.from(set).sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return by - ay || bm - am;
    });
  }, [leads]);

  const latestMonth = months[0] ?? null;

  // Mặc định luôn hiển thị tháng mới nhất; nếu leads đổi (có tháng mới) thì tự chuyển về tháng mới nhất
  const [selectedMonth, setSelectedMonth] = useState<string | null>(latestMonth);
  useEffect(() => {
    setSelectedMonth(latestMonth);
  }, [latestMonth]);

  // Khi URL có ?focus={id} (click từ thông báo lead) → cuộn tới & làm nổi bật dòng lead đó
  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`lead-row-${focusId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-focus");
      setTimeout(() => el.classList.remove("row-focus"), 3500);
    }, 100);
    return () => clearTimeout(timer);
  }, [focusId]);

  async function removeLead(id: number, name: string, phone: string) {
    const result = await Swal.fire({
      title: "Xoá khách hàng tiềm năng?",
      text: `Bạn có chắc muốn xoá "${name}" (${phone})? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá lead", name);
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể xoá", err.message || String(err));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (selectedMonth && monthKey(l.createdAt) !== selectedMonth) return false;
      if (fStatus && l.status !== fStatus) return false;
      if (fSource && l.source !== fSource) return false;
      if (!query) return true;
      return (
        l.name.toLowerCase().includes(query) ||
        l.phone.toLowerCase().includes(query) ||
        (l.purpose || "").toLowerCase().includes(query) ||
        (l.address || "").toLowerCase().includes(query) ||
        l.source.toLowerCase().includes(query)
      );
    });
  }, [q, fStatus, fSource, leads, selectedMonth]);
  // Phân trang 10 dòng/trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  async function changeStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Cập nhật thất bại");
      toast.success("Đã cập nhật trạng thái", status);
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể cập nhật", err.message || String(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignLead(id: number, ownerId: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ownerId: ownerId ? Number(ownerId) : null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Phân công thất bại");
      toast.success("Đã phân công", ownerId ? "Đã gửi thông báo cho nhân viên." : "Đã bỏ phân công.");
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể phân công", err.message || String(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function changeItem(id: number, patch: Record<string, unknown>) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Cập nhật thất bại");
      toast.success("Đã cập nhật hồi đáp liên hệ");
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể cập nhật", err.message || String(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {/* Chuyển đổi giữa các tháng */}
      {months.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] text-slate-500 font-semibold">Xem theo:</span>
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                selectedMonth === m
                  ? "btn-primary"
                  : "bg-[var(--bg-2)] text-slate-400 border border-[var(--border)] hover:text-white"
              }`}
            >
              {monthLabel(m)}
              {m === latestMonth && <span className="ml-1 opacity-70">(mới nhất)</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 min-w-[200px] max-w-md flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3">
          <Search size={14} className="text-slate-500" />
          <input
            className="bg-transparent outline-none text-xs w-full py-2.5"
            placeholder="Tìm theo tên, SĐT, nguồn..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="input !w-auto !py-2 text-xs">
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={fSource} onChange={(e) => setFSource(e.target.value)} className="input !w-auto !py-2 text-xs">
          <option value="">Tất cả nguồn</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="card overflow-auto">
        <table className="w-full text-left text-xs data-table">
          <thead>
            <tr>
              <th className="p-3">Họ tên</th>
              <th>SĐT</th>
              <th>Nguồn</th>
              <th>Nội dung</th>
              <th>Phụ trách</th>
              <th>Địa chỉ</th>
              <th>Đã liên hệ</th>
              <th>Trạng thái hồi đáp</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((l) => (
              <tr key={l.id} id={`lead-row-${l.id}`} className="scroll-mt-24">
                <td className="p-3 font-bold">{l.name}</td>
                <td>{l.phone}</td>
                <td>{l.source}{l.utmCampaign ? <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-300 whitespace-nowrap" title={`UTM: ${l.utmSource || "?"} / ${l.utmMedium || "?"} / ${l.utmCampaign}`}>UTM: {l.utmCampaign}</span> : null}</td>
                <td>{l.purpose || "—"}</td>
                <td className="py-2">
                  <select
                    value={l.owner?.id ? String(l.owner.id) : ""}
                    disabled={updatingId === l.id || !canUpdate}
                    onChange={(e) => assignLead(l.id, e.target.value)}
                    className="bg-transparent border border-[var(--border)] rounded px-1.5 py-1 text-[11px] outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">— Chưa gán —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[var(--panel)] text-[var(--text)]">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-slate-500">{l.address || "—"}</td>
                <td className="py-2">
                  <select
                    value={l.contacted}
                    disabled={updatingId === l.id || !canUpdate}
                    onChange={(e) => changeItem(l.id, { contacted: e.target.value })}
                    className="bg-transparent border border-[var(--border)] rounded px-1.5 py-1 text-[11px] outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {CONTACTED_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[var(--panel)] text-[var(--text)]">
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <select
                    value={l.responseStatus}
                    disabled={updatingId === l.id || !canUpdate}
                    onChange={(e) => changeItem(l.id, { responseStatus: e.target.value })}
                    className="bg-transparent border border-[var(--border)] rounded px-1.5 py-1 text-[11px] outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {RESPONSE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[var(--panel)] text-[var(--text)]">
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <select
                    value={l.status}
                    disabled={updatingId === l.id || !canUpdate}
                    onChange={(e) => changeStatus(l.id, e.target.value)}
                    className="bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: "inherit" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-[var(--panel)] text-[var(--text)]">
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-slate-500">
                  {new Date(l.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="py-2">
                  {canDelete && (
                    <button
                      onClick={() => removeLead(l.id, l.name, l.phone)}
                      disabled={deletingId === l.id}
                      className="btn-icon text-rose-400 hover:text-rose-300"
                      type="button"
                      title="Xoá lead"
                    >
                      {deletingId === l.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  Không tìm thấy lead nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}