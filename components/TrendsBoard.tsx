"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import usePerm from "./usePerm";
import { Spinner } from "./ui";
import { Flame, RefreshCw, Plus, Edit3, Trash2, TrendingUp, Search, Sparkles, X } from "./icons";
import Swal from "sweetalert2";

type Trend = {
  id: number;
  title: string;
  platform: string;
  category: string;
  views: number;
  growth: number;
  score: number;
  recommendation?: string | null;
  source: string; // ai | google-trends | google-news | manual
  link?: string | null;
  note?: string | null;
  owner?: { id: number; name: string } | null;
  createdAt: string | Date;
};

const CATEGORIES = ["Giá đất", "Chính sách", "Cho thuê", "Đầu tư", "Mẫu nhà", "Pháp lý", "Vay mua nhà", "Nội thất", "Khác"];
const PLATFORMS = ["TikTok", "Facebook", "Google", "YouTube", "Tin tức"];

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  ai: { label: "🤖 AI ước lượng", cls: "bg-amber-500/15 text-amber-400" },
  "google-trends": { label: "📈 Google Trends", cls: "bg-sky-500/15 text-sky-400" },
  "google-news": { label: "📰 Tin nóng BĐS", cls: "bg-violet-500/15 text-violet-300" },
  manual: { label: "✍️ Thủ công", cls: "bg-emerald-500/15 text-emerald-400" },
};

const PLATFORM_CLS: Record<string, string> = {
  TikTok: "bg-white/10 text-white ring-1 ring-white/30",
  Facebook: "bg-[#1877f2]/15 text-[#4d9fff] ring-1 ring-[#1877f2]/30",
  Google: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  YouTube: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  "Tin tức": "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function TrendsBoard({ initial }: { initial: Trend[] }) {
  const router = useRouter();
  const toast = useToast();
  const canCreate = usePerm("trends_create");
  const canDelete = usePerm("trends_delete");

  const [trends, setTrends] = useState<Trend[]>(initial);
  const [collecting, setCollecting] = useState(false);
  const [q, setQ] = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [sortKey, setSortKey] = useState<"score" | "views" | "growth" | "newest">("score");
  // Lọc bằng AI: các trend liên quan đến công ty (kèm lý do)
  const [aiResult, setAiResult] = useState<{ relevant: { id: number; reason: string }[]; total: number } | null>(null);
  const [aiFiltering, setAiFiltering] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Trend | null>(null);
  const [form, setForm] = useState({ title: "", platform: "TikTok", category: "Giá đất", views: "0", growth: "0", link: "", note: "" });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const aiIds = aiResult ? new Set(aiResult.relevant.map((r) => r.id)) : null;
    const reasonById = aiResult ? new Map(aiResult.relevant.map((r) => [r.id, r.reason])) : null;
    const list = trends.filter((t) => {
      if (aiIds && !aiIds.has(t.id)) return false;
      if (fPlatform && t.platform !== fPlatform) return false;
      if (query && !`${t.title} ${t.category} ${t.recommendation || ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
    // Sắp xếp CAO → THẤP theo tiêu chí chọn
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "score") return b.score - a.score;
      if (sortKey === "views") return b.views - a.views;
      if (sortKey === "growth") return b.growth - a.growth;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    // Gắn lý do AI vào từng trend (dùng khi render)
    (sorted as any[]).forEach((t) => { t.__aiReason = reasonById?.get(t.id) || null; });
    return sorted;
  }, [trends, q, fPlatform, sortKey, aiResult]);

  /** Dùng AI lọc trend liên quan đến công ty */
  async function aiFilter() {
    setAiFiltering(true);
    try {
      const res = await fetch("/api/trends/ai-filter", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lọc AI thất bại");
      if (!data.relevant?.length) {
        setAiResult(null);
        toast.warning("AI không tìm thấy trend nào liên quan đến công ty", `Đã phân tích ${data.total} trend — thử thu thập thêm trend mới.`);
        return;
      }
      setAiResult({ relevant: data.relevant, total: data.total });
      toast.success(`AI lọc xong: ${data.relevant.length}/${data.total} trend liên quan công ty`, "Các trend không liên quan đã được ẩn.");
    } catch (err: any) {
      toast.error("Lọc bằng AI thất bại", err.message || String(err));
    } finally {
      setAiFiltering(false);
    }
  }

  async function reload() {
    const list = await fetch("/api/trends").then((r) => r.json());
    if (list.ok) setTrends(list.trends);
    router.refresh();
  }

  async function collect() {
    setCollecting(true);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Thu thập thất bại");
      await reload();
      if (data.aiError) {
        // AI hỏng — vẫn có trend Google, cảnh báo riêng cho phần AI
        toast.warning("Thu thập được trend từ Google — nhưng phần AI chưa chạy được", data.aiError);
      } else {
        toast.success(
          "Đã thu thập trend",
          `Google Trends: +${data.added?.google ?? 0} — AI: +${data.added?.ai ?? 0} — Tin nóng: +${data.added?.news ?? 0}` + (!data.aiEnabled ? " (chưa cấu hình AI key — chỉ có Google Trends & Tin nóng)" : "")
        );
      }
    } catch (err: any) {
      toast.error("Thu thập trend thất bại", err.message || String(err));
    } finally {
      setCollecting(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: "", platform: "TikTok", category: "Giá đất", views: "0", growth: "0", link: "", note: "" });
    setShowForm(true);
  }

  function openEdit(t: Trend) {
    setEditing(t);
    setForm({ title: t.title, platform: t.platform, category: t.category, views: String(t.views), growth: String(t.growth), link: t.link || "", note: t.note || "" });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const res = await fetch("/api/trends", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại");
      toast.success(editing ? "Đã cập nhật trend" : "Đã thêm trend", form.title);
      setShowForm(false);
      await reload();
    } catch (err: any) {
      toast.error("Lưu trend thất bại", err.message || String(err));
    }
  }

  async function handleDelete(t: Trend) {
    const cf = await Swal.fire({
      title: "Xoá trend này?",
      text: `Bạn có chắc muốn xoá "${t.title}"? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      const res = await fetch(`/api/trends?id=${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Xoá thất bại");
      setTrends((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Đã xoá trend", t.title);
      router.refresh();
    } catch (err: any) {
      toast.error("Xoá trend thất bại", err.message || String(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-lg px-3 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            className="bg-transparent outline-none text-xs w-full py-2.5"
            placeholder="Tìm trend theo tên, chủ đề, gợi ý..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select value={fPlatform} onChange={(e) => setFPlatform(e.target.value)} className="input !py-2.5 text-xs max-w-[150px]">
          <option value="">Tất cả nền tảng</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="input !py-2.5 text-xs max-w-[190px]" title="Sắp xếp từ cao đến thấp">
          <option value="score">Điểm nóng: cao → thấp</option>
          <option value="views">Lượt quan tâm: cao → thấp</option>
          <option value="growth">Tăng trưởng: cao → thấp</option>
          <option value="newest">Mới nhất trước</option>
        </select>
        {canCreate && (
          <>
            <button onClick={aiFilter} disabled={aiFiltering} className="btn-ghost text-xs" type="button" title="Dùng AI lọc trend liên quan đến công ty của bạn">
              {aiFiltering ? <Spinner size={13} /> : <Sparkles size={14} className={aiFiltering ? "animate-pulse" : ""} />}
              {aiFiltering ? "AI đang lọc..." : "Lọc AI liên quan công ty"}
            </button>
            <button onClick={collect} disabled={collecting} className="btn-primary text-xs" type="button">
              {collecting ? <Spinner size={13} /> : <RefreshCw size={14} className={collecting ? "animate-spin" : ""} />}
              {collecting ? "Đang thu thập..." : "Thu thập trend mới"}
            </button>
            <button onClick={openCreate} className="btn-ghost text-xs" type="button">
              <Plus size={14} /> Thêm thủ công
            </button>
          </>
        )}
      </div>

      {/* Trạng thái lọc AI */}
      {aiResult && (
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-[11px] text-violet-300">
          <Sparkles size={12} className="shrink-0" />
          <span className="font-bold">Lọc AI đang bật:</span>
          <span>hiển thị {aiResult.relevant.length}/{aiResult.total} trend liên quan đến công ty (đã ẩn các trend không liên quan)</span>
          <button onClick={() => setAiResult(null)} className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--panel2)] hover:bg-rose-500/15 hover:text-rose-300 transition" type="button">
            <X size={11} /> Tắt lọc
          </button>
        </div>
      )}

      {/* Lưới trend */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const badge = SOURCE_BADGE[t.source] || SOURCE_BADGE.manual;
          const growthPositive = t.growth >= 0;
          return (
            <div key={t.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLATFORM_CLS[t.platform] || PLATFORM_CLS.TikTok}`}>{t.platform}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel2)] text-slate-400">{t.category}</span>
                {t.owner?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel2)] text-slate-400" title="Người tạo">👤 {t.owner.name}</span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${badge.cls}`}>{badge.label}</span>
              </div>
              <div className="font-bold text-sm leading-snug">{t.title}</div>
              {t.recommendation && <div className="text-[11px] text-slate-400 italic">💡 {t.recommendation}</div>}
              {(t as any).__aiReason && (
                <div className="text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-lg px-2 py-1.5 flex items-start gap-1.5">
                  <Sparkles size={11} className="shrink-0 mt-0.5" />
                  <span className="min-w-0"><b>AI:</b> {(t as any).__aiReason}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs mt-auto pt-2">
                {t.source !== "google-news" && <span className="text-slate-400">👁 {fmt(t.views)}</span>}
                {(t.source === "ai" || t.source === "manual") && (
                  <span className={growthPositive ? "text-emerald-400 flex items-center gap-0.5" : "text-rose-400 flex items-center gap-0.5"}>
                    <TrendingUp size={12} /> {growthPositive ? "+" : ""}{t.growth.toFixed(0)}%
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-[#1b98e0] font-bold">
                  <Flame size={12} /> {t.score}
                </span>
              </div>
              <div className="h-1 rounded-full bg-[var(--panel2)] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#1b98e0] to-amber-400" style={{ width: `${t.score}%` }} />
              </div>
              <div className="flex items-center gap-1 pt-1">
                {(() => {
                  const href = t.link || (t.note && t.note.startsWith("http") ? t.note : null);
                  return href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1.5 rounded-lg bg-[var(--panel2)] hover:bg-[var(--panel2)]/70 text-slate-300 font-medium transition flex items-center gap-1" title="Đọc bài gốc">
                      🔗 Đọc bài
                    </a>
                  ) : null;
                })()}
                {canCreate && (
                  <button onClick={() => openEdit(t)} className="p-1.5 text-[#1b98e0] hover:bg-[#1b98e0]/10 rounded-lg transition" title="Sửa" type="button">
                    <Edit3 size={13} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(t)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition ml-auto" title="Xoá" type="button">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-10 text-center text-slate-400 text-sm">
          {trends.length === 0
            ? "Chưa có trend nào. Nhấn \"Thu thập trend mới\" để bắt đầu!"
            : "Không có trend khớp bộ lọc."}
        </div>
      )}

      {/* Modal thêm/sửa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="card w-full max-w-md p-6">
            <div className="font-extrabold text-lg mb-4">{editing ? "Sửa trend" : "Thêm trend thủ công"}</div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="field-label">Tên trend *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Giá đất Thủ Đức tăng mạnh" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Nền tảng</label>
                  <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Chủ đề</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Lượt quan tâm</label>
                  <input type="number" className="input" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Tăng trưởng %</label>
                  <input type="number" className="input" value={form.growth} onChange={(e) => setForm({ ...form, growth: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label">Đường dẫn bài đăng (URL)</label>
                <input className="input font-mono text-xs" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://facebook.com/... hoặc https://tiktok.com/..." />
              </div>
              <div>
                <label className="field-label">Ghi chú</label>
                <textarea className="input min-h-[60px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm (tuỳ chọn)" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">Huỷ</button>
                <button type="submit" className="btn-primary">{editing ? "Cập nhật" : "Thêm trend"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}