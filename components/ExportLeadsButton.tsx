"use client";
import { useMemo, useState } from "react";
import { Download, ChevronDown } from "./icons";
import { useToast } from "./toast";
import { Spinner } from "./ui";
import usePerm from "./usePerm";

/** Nút "Xuất Excel" — tải file .xls có bảng màu của danh sách khách hàng tiềm năng.
 *  Cho phép chọn xuất: tháng mới nhất / tháng trước đó / tất cả. */
export default function ExportLeadsButton({ months }: { months?: { key: string; label: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const canExport = usePerm("leads_export");

  const options = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (months && months.length > 0) {
      opts.push({ value: months[0].key, label: `${months[0].label} (mới nhất)` });
      if (months[1]) opts.push({ value: months[1].key, label: months[1].label });
    }
    opts.push({ value: "all", label: "Tất cả các tháng" });
    return opts;
  }, [months]);

  async function doExport(month: string) {
    setBusy(true);
    setOpen(false);
    try {
      const qs = month && month !== "all" ? `?month=${encodeURIComponent(month)}` : "";
      const res = await fetch(`/api/leads/export${qs}`);
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
      a.download = match ? match[1] : `khach-hang-tiem-nang-${Date.now()}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã xuất Excel", "File Excel có bảng màu đã được tải xuống.");
    } catch (err: any) {
      toast.error("Xuất Excel thất bại", err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!months || months.length <= 1) {
    return (
      <button
        onClick={() => doExport("all")}
        disabled={busy || !canExport}
        type="button"
        title="Xuất danh sách khách hàng ra file Excel"
        className={`btn-ghost ${!canExport ? "opacity-40" : ""}`}
      >
        {busy ? <Spinner size={13} /> : <Download size={14} />}
        {busy ? "Đang xuất..." : "Xuất Excel"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy || !canExport}
        type="button"
        title="Xuất danh sách khách hàng ra file Excel"
        className={`btn-ghost ${!canExport ? "opacity-40" : ""}`}
      >
        {busy ? <Spinner size={13} /> : <Download size={14} />}
        {busy ? "Đang xuất..." : "Xuất Excel"}
        {!busy && <ChevronDown size={12} />}
      </button>
      {open && !busy && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-56 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => doExport(o.value)}
                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[var(--bg-2)] transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}