"use client";
import { useMemo, useState } from "react";
import { Search, CalendarDays, X } from "./icons";
import Pagination from "./Pagination";
import { EmptyState } from "./ui";

type Log = {
  id: number;
  userName: string | null;
  module: string;
  action: string;
  detail: string | null;
  createdAt: string | Date;
};

const MODULE_LABEL: Record<string, string> = {
  content: "Nội dung",
  leads: "Khách hàng tiềm năng",
  projects: "Dự án",
  tasks: "Công việc",
  workflow: "Quy trình",
  users: "Tài khoản",
  reports: "Báo cáo",
  settings: "Cài đặt",
  insights: "Gợi ý AI",
  trends: "Xu hướng",
  workreports: "Báo cáo công việc",
  ads: "Chạy quảng cáo",
  social: "Mạng xã hội",
  "social-channels": "Kênh MXH",
  auth: "Đăng nhập",
  profile: "Hồ sơ cá nhân",
  notifications: "Thông báo",
  dailyreports: "Nhật ký công việc",
  chat: "Trò chuyện",
  other: "Khác",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  view: "Xem",
  generate: "Sinh",
  submit: "Nộp",
  toggle: "Bật/Tắt",
  export: "Xuất file",
  upload: "Tải lên",
  download: "Tải về",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  reset: "Đặt lại",
  import: "Nhập",
  sync: "Đồng bộ",
};

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-400",
  update: "bg-[#1b98e0]/15 text-violet-400",
  delete: "bg-rose-500/15 text-rose-400",
  view: "bg-sky-500/15 text-sky-400",
  generate: "bg-amber-500/15 text-amber-400",
  submit: "bg-cyan-500/15 text-cyan-400",
  toggle: "bg-amber-500/15 text-amber-400",
  export: "bg-emerald-500/15 text-teal-400",
  upload: "bg-cyan-500/15 text-cyan-400",
  download: "bg-sky-500/15 text-sky-400",
  login: "bg-emerald-500/15 text-emerald-400",
  logout: "bg-slate-500/15 text-slate-400",
  reset: "bg-amber-500/15 text-amber-400",
  import: "bg-cyan-500/15 text-cyan-400",
  sync: "bg-violet-500/15 text-violet-400",
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivityLogTable({ logs }: { logs: Log[] }) {
  const [text, setText] = useState("");
  const [fUser, setFUser] = useState("");
  const [fModule, setFModule] = useState("");
  const [fAction, setFAction] = useState("");
  const [fDate, setFDate] = useState("");

  const userLabel = (l: Log) => (l.userName && l.userName !== "Hệ thống" ? l.userName : "Hệ thống");

  const userOpts = useMemo(() => Array.from(new Set(logs.map(userLabel))).sort(), [logs]);
  const moduleOpts = useMemo(() => Array.from(new Set(logs.map((l) => l.module))).sort(), [logs]);
  const actionOpts = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return logs.filter((l) => {
      if (fUser && userLabel(l) !== fUser) return false;
      if (fModule && l.module !== fModule) return false;
      if (fAction && l.action !== fAction) return false;
      if (fDate && dayKey(new Date(l.createdAt)) !== fDate) return false;
      if (q) {
        const hay = `${userLabel(l)} ${l.module} ${l.action} ${l.detail || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, text, fUser, fModule, fAction, fDate]);
  // Phân trang 10 dòng/trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  const groups = useMemo(() => {
    const map = new Map<string, Log[]>();
    for (const l of paged) {
      const key = dayKey(new Date(l.createdAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({ date, items }));
  }, [filtered, paged]);

  const total = filtered.length;
  const hasFilter = !!(text || fUser || fModule || fAction || fDate);
  const clear = () => { setText(""); setFUser(""); setFModule(""); setFAction(""); setFDate(""); };
  const selCls = "input !py-2 !px-2.5 text-[12px]";

  return (
    <div>
      {/* Thanh lọc */}
      <div className="card p-3 mb-4 space-y-3">
        <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            className="bg-transparent outline-none text-xs w-full py-2.5"
            placeholder="Tìm theo tên, chức năng, thao tác, chi tiết..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {text && (
            <button onClick={() => setText("")} className="text-slate-500 hover:text-white" type="button" title="Xoá tìm kiếm">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select className={selCls} value={fUser} onChange={(e) => setFUser(e.target.value)}>
            <option value="">👤 Tất cả tài khoản</option>
            {userOpts.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={selCls} value={fModule} onChange={(e) => setFModule(e.target.value)}>
            <option value="">📦 Tất cả chức năng</option>
            {moduleOpts.map((m) => <option key={m} value={m}>{MODULE_LABEL[m] || m}</option>)}
          </select>
          <select className={selCls} value={fAction} onChange={(e) => setFAction(e.target.value)}>
            <option value="">🔧 Tất cả thao tác</option>
            {actionOpts.map((a) => <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>)}
          </select>
          <input type="date" className={selCls} value={fDate} onChange={(e) => setFDate(e.target.value)} title="Lọc theo ngày" />
        </div>
        {hasFilter && (
          <button onClick={clear} className="btn-ghost text-[11px] px-3 py-1.5" type="button">
            <X size={12} /> Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Tổng kết */}
      <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500">
        <span>Hiển thị <b className="text-slate-300">{total}</b> hoạt động • {groups.length} ngày</span>
      </div>

      {total === 0 ? (
        <EmptyState title="Không có lịch sử phù hợp" desc="Thử thay đổi bộ lọc, hoặc thực hiện thao tác để hệ thống ghi lại." />
      ) : (
        <>
        <div className="space-y-6">
          {groups.map((g) => {
            const d = new Date(g.date + "T00:00:00");
            return (
              <div key={g.date}>
                <div className="px-3 py-2 mb-2 flex items-center gap-2 rounded-lg bg-[var(--panel2)] border border-[var(--border)]">
                  <CalendarDays size={15} className="text-violet-400" />
                  <span className="text-[12px] font-extrabold capitalize">
                    {d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  <span className="text-[10px] text-slate-500">({g.items.length} hoạt động)</span>
                </div>

                <div className="card overflow-auto">
                  <table className="w-full text-left text-xs data-table">
                    <thead>
                      <tr>
                        <th className="p-3">Tài khoản</th>
                        <th>Chức năng</th>
                        <th>Thao tác</th>
                        <th>Chi tiết</th>
                        <th>Giờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((l) => (
                        <tr key={l.id}>
                          <td className="p-3 font-bold whitespace-nowrap">{userLabel(l)}</td>
                          <td>{MODULE_LABEL[l.module] || l.module}</td>
                          <td>
                            <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${ACTION_TONE[l.action] || "bg-slate-500/15 text-slate-400"}`}>
                              {ACTION_LABEL[l.action] || l.action}
                            </span>
                          </td>
                          <td className="text-slate-400 max-w-md truncate" title={l.detail || ""}>{l.detail || "—"}</td>
                          <td className="text-slate-500 whitespace-nowrap">
                            {new Date(l.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
