"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "./icons";

type FilterDef = {
  key: string;
  label: string;
  options: string[]; // options[0] = "" (Tất cả)
};

/**
 * Thanh lọc dùng chung cho các trang server: ô tìm kiếm (q, debounce 350ms)
 * + các dropdown lọc (key = tên query param). Thay đổi → cập nhật URL,
 * trang server sẽ đọc searchParams để lọc dữ liệu.
 */
export default function UrlFilters({
  defs = [],
  placeholder = "Tìm kiếm...",
}: {
  defs?: FilterDef[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setSel(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex-1 min-w-[200px] max-w-md flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3">
        <Search size={14} className="text-slate-500" />
        <input
          className="bg-transparent outline-none text-xs w-full py-2.5"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {defs.map((d) => (
        <select
          key={d.key}
          value={sp.get(d.key) || ""}
          onChange={(e) => setSel(d.key, e.target.value)}
          className="input !w-auto !py-2 text-xs"
        >
          {d.options.map((o) => (
            <option key={o || d.key} value={o}>
              {o || `Tất cả ${d.label.toLowerCase()}`}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
