"use client";

/**
 * Thanh phân trang dùng chung — 10 dòng/trang.
 * page/trang hiện tại, totalPages, total (tổng số dòng), pageSize, onPage(callback).
 */
export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total <= 0 || totalPages <= 1) {
    // Vẫn hiển thị dòng thông tin khi chỉ có 1 trang
    if (total <= 0) return null;
  }
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages
  );
  const btn =
    "h-7 min-w-7 px-2 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const idle = btn + " bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel)]";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-1 border-t border-[var(--border-soft)]">
      <div className="text-[11px] text-slate-400">
        Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trên {total} dòng
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(1)} disabled={page === 1} className={idle} title="Trang đầu">
          «
        </button>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} className={idle} title="Trang trước">
          ‹
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-[11px] text-slate-500">…</span>}
            <button
              type="button"
              onClick={() => onPage(p)}
              className={btn + (p === page ? " bg-[#1b98e0] text-white" : idle.replace(btn, " bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel)]"))}
            >
              {p}
            </button>
          </span>
        ))}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page === totalPages} className={idle} title="Trang sau">
          ›
        </button>
        <button type="button" onClick={() => onPage(totalPages)} disabled={page === totalPages} className={idle} title="Trang cuối">
          »
        </button>
      </div>
    </div>
  );
}