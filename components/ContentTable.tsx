"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Search, MoreHorizontal, Trash2, Eye, X, Download, Printer as PrintIcon } from "./icons";
import { Spinner } from "./ui";
import Pagination from "./Pagination";
import Swal from "sweetalert2";
import usePerm from "./usePerm";
import EditContentModal from "./EditContentModal";

type ContentRow = {
  id: number;
  title: string;
  platform: string;
  type?: string | null;
  createdAt: string | Date;
  views: number;
  scheduledAt?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string | null;
};

const PLATFORMS = ["Facebook", "Zalo", "TikTok", "Website", "YouTube"];

type SortKey = "title" | "platform" | "createdAt" | "views";
type DateFilter = "all" | "today" | "7d" | "30d";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "Chọn ngày",
  today: "Hôm nay",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
};

const PLATFORM_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  TikTok: { bg: "bg-rose-500/10", text: "text-rose-500", icon: "🎵" },
  Facebook: { bg: "bg-blue-500/10", text: "text-blue-500", icon: "f" },
  Zalo: { bg: "bg-sky-500/10", text: "text-sky-500", icon: "Z" },
  Website: { bg: "bg-slate-500/10", text: "text-slate-500", icon: "🌐" },
  YouTube: { bg: "bg-red-500/10", text: "text-red-500", icon: "▶" },
};

function PlatformBadge({ platform }: { platform: string }) {
  const s = PLATFORM_STYLES[platform] || { bg: "bg-[var(--panel2)]", text: "text-slate-400", icon: "•" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className="leading-none">{s.icon}</span>
      {platform}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M7 10l5-5 5 5M7 14l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          !active
            ? "text-slate-400"
            : dir === "asc"
            ? "text-[#1b98e0] [&>path:last-child]:opacity-25"
            : "text-[#1b98e0] [&>path:first-child]:opacity-25"
        }
      />
    </svg>
  );
}

function CalendarIcon({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownSmall({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniTrendIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="12" width="3.5" height="8" rx="1" fill="currentColor" />
      <rect x="10.25" y="7" width="3.5" height="13" rx="1" fill="currentColor" />
      <rect x="16.5" y="3" width="3.5" height="17" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Menu được portal ra document.body, tự tính vị trí theo nút anchor. */
function ActionMenu({
  anchorEl,
  onClose,
  children,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function computePos() {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 176; // w-44 = 11rem = 176px
      const margin = 8;

      let left = rect.right - menuWidth;
      if (left < margin) left = margin;
      if (left + menuWidth > window.innerWidth - margin) {
        left = window.innerWidth - menuWidth - margin;
      }

      let top = rect.bottom + 6;
      const estMenuHeight = menuRef.current?.offsetHeight ?? 200;
      if (top + estMenuHeight > window.innerHeight - margin) {
        top = rect.top - estMenuHeight - 6;
      }

      setPos({ top, left });
    }

    computePos();

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        e.target !== anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", computePos, true);
    window.addEventListener("resize", computePos);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", computePos, true);
      window.removeEventListener("resize", computePos);
    };
  }, [anchorEl, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      className="z-[999] w-44 glass rounded-xl p-1.5 shadow-2xl animate-in"
    >
      {children}
    </div>,
    document.body
  );
}

export default function ContentTable({ contents }: { contents: ContentRow[] }) {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("Tất cả nền tảng");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [menuFor, setMenuFor] = useState<{ id: number; el: HTMLElement } | null>(null);
  const router = useRouter();
  const toast = useToast();
  const canEdit = usePerm("content_update");
  const canDelete = usePerm("content_delete");
  const [viewing, setViewing] = useState<ContentRow | null>(null);
  const [exporting, setExporting] = useState(false);

  /** Bỏ HTML escapes để chèn vào khung in/PDF an toàn */
  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** HTML sạch (nền trắng, chữ đen) dùng cho cả In + PDF */
  function buildPrintHtml(c: ContentRow) {
    const meta = [
      c.platform,
      c.type || "",
      `Tạo ${new Date(c.createdAt).toLocaleDateString("vi-VN")}`,
      c.scheduledAt ? `Lịch đăng ${new Date(c.scheduledAt).toLocaleString("vi-VN")}` : "",
    ].filter(Boolean).join(" · ");
    return `
      <h2 class="t">${escapeHtml(c.title)}</h2>
      <div class="m">${escapeHtml(meta)}</div>
      <h3>🎬 KỊCH BẢN</h3>
      <div class="s">${escapeHtml(c.script || "(Chưa có kịch bản)")}</div>
      <h3>📝 CAPTION</h3>
      <div class="c">${escapeHtml(c.caption || "(Chưa có caption)")}</div>
      <h3>#️⃣ HASHTAG</h3>
      <div class="h">${escapeHtml(c.hashtags || "(Chưa có hashtag)")}</div>`;
  }

  const PRINT_CSS = `
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; }
    h2.t { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .m { font-size: 12px; color: #555; margin-bottom: 18px; }
    h3 { font-size: 13px; margin: 18px 0 6px; text-transform: none; }
    .s, .c, .h { white-space: pre-wrap; font-size: 13px; line-height: 1.65; border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; }
    @media print { body { margin: 16px; } }`;

  /** 🖨 In kịch bản — mở cửa sổ sạch chỉ chứa nội dung rồi gọi in */
  function printContent(c: ContentRow) {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) {
      toast.error("Trình duyệt chặn cửa sổ in", "Cho phép pop-up cho trang này rồi thử lại.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(c.title)}</title><style>${PRINT_CSS}</style></head><body>${buildPrintHtml(c)}<script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
    w.focus();
  }

  /** ⬇ Tải PDF — render khung trắng ra ảnh rồi nhúng vào file A4 nhiều trang */
  async function downloadPdf(c: ContentRow) {
    setExporting(true);
    try {
      const [{ jsPDF }, h2cModule] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const html2canvas = h2cModule.default;

      const el = document.createElement("div");
      el.style.cssText = "position:fixed;left:-9999px;top:0;width:720px;background:#ffffff;color:#111;padding:32px;font-family:Arial,Helvetica,sans-serif;";
      el.innerHTML = buildPrintHtml(c);
      document.body.appendChild(el);

      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      document.body.removeChild(el);

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const img = canvas.toDataURL("image/png");

      pdf.addImage(img, "PNG", margin, margin, imgW, imgH);
      let remaining = imgH - (pageH - margin * 2);
      let offset = margin;
      while (remaining > 0) {
        offset -= pageH - margin * 2;
        pdf.addPage();
        pdf.addImage(img, "PNG", margin, offset, imgW, imgH);
        remaining -= pageH - margin * 2;
      }

      const fileName = `${c.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80) || "content"}.pdf`;
      pdf.save(fileName);
      toast.success("Đã tải file PDF", fileName);
    } catch (err: any) {
      toast.error("Không tạo được PDF", err.message || String(err));
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" || key === "views" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now = Date.now();
    const cutoff = dateFilter === "today" ? new Date().setHours(0, 0, 0, 0) : dateFilter === "7d" ? now - 7 * 86400000 : dateFilter === "30d" ? now - 30 * 86400000 : null;
    let rows = contents.filter((c) => {
      if (query && !c.title.toLowerCase().includes(query)) return false;
      if (platform !== "Tất cả nền tảng" && c.platform !== platform) return false;
      if (cutoff !== null && new Date(c.createdAt).getTime() < cutoff) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title, "vi");
      else if (sortKey === "platform") cmp = a.platform.localeCompare(b.platform, "vi");
      else if (sortKey === "views") cmp = a.views - b.views;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [q, platform, dateFilter, sortKey, sortDir, contents]);
  // Phân trang 10 dòng/trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [q, platform, dateFilter]);

  async function remove(id: number, title: string) {
    setMenuFor(null);
    const result = await Swal.fire({
      title: "Xoá content?",
      text: `Bạn có chắc muốn xoá "${title}"? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/contents?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá content", title);
      router.refresh();
    } catch (err: any) {
      toast.error("Không thể xoá", err.message || String(err));
    }
  }

  const SortableTh = ({ label, sk }: { label: string; sk: SortKey }) => (
    <th className="p-3">
      <button
        type="button"
        onClick={() => toggleSort(sk)}
        className="flex items-center gap-1 font-bold hover:text-[var(--text)] transition"
      >
        {label}
        <SortIcon active={sortKey === sk} dir={sortDir} />
      </button>
    </th>
  );

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-slate-500" />
          <input
            className="bg-transparent outline-none text-xs w-full"
            placeholder="Tìm kiếm content..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium min-w-[170px] whitespace-nowrap">
            <span className={platform === "Tất cả nền tảng" ? "text-slate-500" : "text-[var(--text)] font-bold"}>
              {platform}
            </span>
            <ChevronDownSmall size={13} className="text-slate-500 ml-auto shrink-0" />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer text-xs"
            aria-label="Lọc theo nền tảng"
          >
            <option>Tất cả nền tảng</option>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium min-w-[150px] whitespace-nowrap">
            <CalendarIcon size={14} className="text-slate-500 shrink-0" />
            <span className={dateFilter === "all" ? "text-slate-500" : "text-[var(--text)] font-bold"}>
              {DATE_FILTER_LABELS[dateFilter]}
            </span>
            <ChevronDownSmall size={13} className="text-slate-500 ml-auto shrink-0" />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="absolute inset-0 opacity-0 cursor-pointer text-xs"
            aria-label="Lọc theo ngày"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày qua</option>
            <option value="30d">30 ngày qua</option>
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-xs data-table">
          <thead>
            <tr>
              <th className="p-3 w-10">#</th>
              <SortableTh label="Tiêu đề" sk="title" />
              <SortableTh label="Nền tảng" sk="platform" />
              <SortableTh label="Ngày tạo" sk="createdAt" />
              <SortableTh label="Lượt xem" sk="views" />
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c, i) => {
              const subtitle = (c.caption || c.script || "").trim();
              const created = new Date(c.createdAt);
              return (
                <tr key={c.id}>
                  <td className="p-3 text-slate-500 font-bold">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 max-w-[280px]">
                    <div className="font-bold truncate">{c.title}</div>
                    {subtitle && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</div>
                    )}
                  </td>
                  <td>
                    <PlatformBadge platform={c.platform} />
                  </td>
                  <td className="text-slate-500">
                    <div className="font-semibold text-[var(--text)]">{created.toLocaleDateString("vi-VN")}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {created.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text)] font-semibold">{c.views.toLocaleString()}</span>
                      <span className="h-6 w-6 rounded-md bg-sky-500/10 text-sky-500 grid place-items-center" title="Xu hướng lượt xem">
                        <MiniTrendIcon size={13} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Xem chi tiết content"
                        onClick={() => setViewing(c)}
                      >
                        <Eye size={15} />
                      </button>
                      {(canEdit || canDelete) && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) =>
                            setMenuFor(
                              menuFor?.id === c.id ? null : { id: c.id, el: e.currentTarget }
                            )
                          }
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    </div>
                    {menuFor?.id === c.id && (
                      <ActionMenu anchorEl={menuFor.el} onClose={() => setMenuFor(null)}>
                        {canEdit && (
                          <EditContentModal item={c as any} />
                        )}
                        {canDelete && (
                          <button
                            onClick={() => remove(c.id, c.title)}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                            type="button"
                          >
                            <Trash2 size={12} /> Xoá content
                          </button>
                        )}
                      </ActionMenu>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Không có content nào phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />

      {/* Modal xem chi tiết content */}
      {viewing && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setViewing(null)}>
          <div
            className="card w-full max-w-xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">{viewing.platform}{viewing.type ? ` · ${viewing.type}` : ""}</span>
                </div>
                <h3 className="font-extrabold text-base mt-1.5 leading-snug">{viewing.title}</h3>
              </div>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--panel2)] hover:text-white transition shrink-0" title="Đóng" type="button">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-3">
              <div className="rounded-lg bg-[var(--panel2)] px-2.5 py-2">
                <div className="text-slate-500">Ngày tạo</div>
                <div className="font-bold mt-0.5">{new Date(viewing.createdAt).toLocaleDateString("vi-VN")}</div>
              </div>
              <div className="rounded-lg bg-[var(--panel2)] px-2.5 py-2">
                <div className="text-slate-500">Lịch đăng</div>
                <div className="font-bold mt-0.5">
                  {viewing.scheduledAt ? new Date(viewing.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--panel2)] px-2.5 py-2">
                <div className="text-slate-500">Lượt xem</div>
                <div className="font-bold mt-0.5">{viewing.views.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-[var(--panel2)] px-2.5 py-2">
                <div className="text-slate-500">Nền tảng</div>
                <div className="font-bold mt-0.5">{viewing.platform}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-violet-300 mb-1 flex items-center gap-1.5">🎬 KỊCH BẢN</div>
                <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-300 leading-5 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-lg p-3 max-h-64 overflow-y-auto">
                  {viewing.script || "(Chưa có kịch bản)"}
                </pre>
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-300 mb-1 flex items-center gap-1.5">📝 CAPTION</div>
                <div className="text-[11px] text-slate-300 leading-5 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-lg p-3">
                  {viewing.caption || "(Chưa có caption)"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1.5">#️⃣ HASHTAG</div>
                <div className="text-[11px] text-violet-300 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-lg p-3 break-words">
                  {viewing.hashtags || "(Chưa có hashtag)"}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => downloadPdf(viewing)} disabled={exporting} className="btn-primary flex-1 justify-center" type="button">
                {exporting ? <Spinner size={14} /> : <Download size={14} />}
                {exporting ? "Đang tạo PDF..." : "⬇ Tải file PDF"}
              </button>
              <button onClick={() => printContent(viewing)} className="btn-ghost flex-1 justify-center" type="button">
                <PrintIcon size={14} /> 🖨 In kịch bản
              </button>
            </div>
            <button onClick={() => setViewing(null)} className="btn-ghost w-full justify-center mt-2" type="button">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}