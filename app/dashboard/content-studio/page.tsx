"use client";
import PageShell from "@/components/page-shell";
import ClientGuard from "@/components/ClientGuard";
import {
  Sparkles,
  Video,
  Hash,
  Target,
  Save,
  CheckCircle2,
} from "@/components/icons";
import { Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Suspense, useEffect, useState } from "react";
import usePerm from "@/components/usePerm";
import { useRouter, useSearchParams } from "next/navigation";

const FALLBACK_SUGGESTIONS: string[] = [];

type AIResult = {
  hook: string;
  script: string;
  caption: string;
  hashtags: string;
};

export default function Studio() {
  return (
    <ClientGuard perm="content_studio">
      <Suspense fallback={null}>
        <StudioInner />
      </Suspense>
    </ClientGuard>
  );
}

function StudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const canGenerate = usePerm("content_studio_create");

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("Chuyên gia");
  const [length, setLength] = useState("60 giây");
  const [goal, setGoal] = useState("Tăng lead");
  const [people, setPeople] = useState("1 người");

  const [result, setResult] = useState<AIResult | null>(null);
  const [provider, setProvider] = useState<"groq" | "internal" | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Đồng hồ đếm thời gian AI đang tạo kịch bản
  const [genSecs, setGenSecs] = useState(0);
  useEffect(() => {
    if (!loading) {
      setGenSecs(0);
      return;
    }
    const t = setInterval(() => setGenSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);
  const genClock = `${String(Math.floor(genSecs / 60)).padStart(2, "0")}:${String(genSecs % 60).padStart(2, "0")}`;
  const genHint =
    genSecs < 30
      ? "Thường mất 30 giây - 3 phút với model free"
      : genSecs < 90
        ? "Model free hơi chậm — đang chờ phản hồi từ AI..."
        : "Model phản hồi khá lâu — kiên nhẫn thêm chút, hoặc đổi model nhanh hơn trong Cài đặt nếu thường xuyên thế này";

  // Gợi ý chủ đề hot = trend điểm cao từ Radar xu hướng (fallback nếu chưa có trend)
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_SUGGESTIONS);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trends?limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const titles = (d?.trends || [])
          .map((t: any) => String(t.title || "").trim())
          .filter(Boolean)
          .slice(0, 8);
        setSuggestions(titles.length ? titles : FALLBACK_SUGGESTIONS);
      })
      .catch(() => {
        if (!cancelled) setSuggestions(FALLBACK_SUGGESTIONS);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = searchParams.get("title");
    if (t) setTitle(t);
  }, [searchParams]);

  async function generate() {
    if (!title.trim()) {
      toast.error("Thiếu chủ đề", "Vui lòng nhập chủ đề hoặc tiêu đề trước.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, platform, tone, length, goal, people: parseInt(people) || 1 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể sinh content");
      setResult(data.result);
      setProvider(data.provider === "groq" ? "groq" : "internal");
      toast.success("Đã sinh content", "AI đã tạo hook, kịch bản, caption & hashtag.");
    } catch (err: any) {
      toast.error("Sinh content thất bại", err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveToManager() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          platform,
          type: "Video",
          tone,
          script: result.script,
          caption: result.caption,
          hashtags: result.hashtags,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lưu content");
      toast.success("Đã lưu vào Content", title);
      router.push("/dashboard/content");
    } catch (err: any) {
      toast.error("Lưu thất bại", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function copyBox(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép", label);
    } catch {
      toast.error("Không sao chép được", "Trình duyệt chặn quyền truy cập clipboard.");
    }
  }

  return (
    <PageShell
      title="Studio nội dung AI"
      subtitle="Biến trend và ý tưởng thành content BĐS hoàn chỉnh"
    >
      <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
        {/* ── Cột nhập liệu ───────────────────────── */}
        <div className="card p-5 sm:p-6 animate-in relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#1b98e0]/10 blur-3xl" />

          <div className="flex items-center gap-2.5 mb-4 relative">
            <div className="h-9 w-9 shrink-0 rounded-xl grid place-items-center bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-sky-950/40">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm leading-tight">Chủ đề nội dung</div>
              <div className="text-[11px] text-slate-500">Nhập ý tưởng, AI sẽ viết hook, kịch bản & caption</div>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input h-28 !py-3 relative"
              placeholder="VD: Có 3 tỷ nên mua nhà hay đầu tư bất động sản?"
            />
            <span className="absolute bottom-2.5 right-3 text-[9px] text-slate-500">{title.length} ký tự</span>
          </div>

          <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
            <Field label="Nền tảng" value={platform} onChange={setPlatform} options={["Facebook", "Zalo", "TikTok", "Website", "YouTube"]} />
            <Field label="Phong cách" value={tone} onChange={setTone} options={["Chuyên gia", "Gần gũi", "Truyền cảm hứng", "Hài hước"]} />
            <Field label="Độ dài video" value={length} onChange={setLength} options={["30 giây", "60 giây", "90 giây", "3 phút"]} />
            <Field label="Mục tiêu" value={goal} onChange={setGoal} options={["Tăng lead", "Tăng nhận diện", "Tăng tương tác", "Chốt sale"]} />
            <Field label="Số người quay" value={people} onChange={setPeople} options={["1 người", "2 người", "3 người", "4 người"]} />
          </div>
          {people !== "1 người" && (
            <p className="text-[10px] text-violet-300 mt-2 flex items-center gap-1">
              🎬 Chế độ {people}: AI sẽ viết kịch bản THOẠI chia lời rõ ràng cho từng người (kèm vai diễn).
            </p>
          )}

          {canGenerate ? (
            <button
              onClick={generate}
              disabled={loading}
              className="btn-primary w-full mt-5 py-3 shadow-lg shadow-sky-950/30"
              type="button"
            >
              {loading ? <Spinner /> : <Sparkles size={16} className={loading ? "" : "animate-pulse"} />}
              {loading ? "AI đang sáng tạo..." : "Tạo content với AI"}
            </button>
          ) : (
            <p className="text-center text-xs text-slate-500 mt-5 py-3 rounded-lg bg-[var(--panel2)] border border-[var(--border)]">
              Bạn không có quyền tạo nội dung (AI).
            </p>
          )}

          {/* Gợi ý chủ đề hot — chỉ hiển thị khi có trend thật từ Radar xu hướng */}
          {!loadingSuggestions && suggestions.length === 0 ? null : (
          <div className="mt-6">
            <div className="text-xs font-bold mb-3 flex items-center gap-1.5 text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0]" /> Gợi ý chủ đề hot
              {loadingSuggestions ? (
                <span className="text-[9px] font-normal text-slate-500 animate-pulse">đang tải từ Radar xu hướng...</span>
              ) : (
                <span className="text-[9px] font-normal text-slate-500">từ Radar xu hướng</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {loadingSuggestions
                ? Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="h-8 w-28 rounded-lg skeleton" />
                  ))
                : suggestions.map((x) => {
                    const active = title === x;
                    return (
                      <button
                        key={x}
                        onClick={() => setTitle(x)}
                        type="button"
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] transition ${
                          active
                            ? "bg-[#1b98e0]/15 border-[#1b98e0] text-violet-200"
                            : "bg-[var(--panel2)] border-[var(--border)] hover:border-[#1b98e0]/60 hover:text-white"
                        }`}
                      >
                        {active && <CheckCircle2 size={12} className="text-violet-300" />}
                        {x}
                      </button>
                    );
                  })}
            </div>
          </div>
          )}
        </div>

        {/* ── Cột kết quả AI ───────────────────────── */}
        <div className="card p-5 sm:p-6 animate-in">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-extrabold flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" /> AI Output
            </h2>
            <span
              className={`badge ${
                result
                  ? provider === "groq"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-amber-500/10 text-amber-300"
                  : "bg-[var(--panel2)] text-slate-400"
              }`}
            >
              {result ? (provider === "groq" ? "GROQ · AI THẬT" : "AI nội bộ") : "Chưa có dữ liệu"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-1">Hook, kịch bản, caption & hashtag sẵn sàng đăng</p>

          {loading && (
            <div className="mt-4 rounded-xl border border-[#1b98e0]/30 bg-[#1b98e0]/5 p-6 flex flex-col items-center gap-3 animate-in">
              <div className="relative h-12 w-12">
                <span className="absolute inset-0 rounded-full border-2 border-[#1b98e0]/25" />
                <span className="absolute inset-0 rounded-full border-2 border-t-[#1b98e0] animate-spin" />
              </div>
              <div className="text-xs font-semibold text-slate-300">AI đang sáng tạo nội dung...</div>
              <div className="text-2xl font-black tabular-nums text-[#1b98e0]">{genClock}</div>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <div className="text-[10px] text-slate-500 text-center max-w-[260px]">{genHint}</div>
            </div>
          )}

          {!loading && result ? (
            <div className="space-y-3 mt-4">
              <Box icon={Target} title="Hook" text={result.hook} onCopy={copyBox}>
                {result.hook}
              </Box>
              <Box icon={Video} title="Kịch bản" text={result.script} onCopy={copyBox}>
                <pre className="whitespace-pre-wrap font-sans">{result.script}</pre>
              </Box>
              <Box icon={Hash} title="Caption & Hashtag" text={`${result.caption}\n${result.hashtags}`} onCopy={copyBox}>
                {result.caption}
                <div className="mt-2 text-violet-300">{result.hashtags}</div>
              </Box>
              <button onClick={saveToManager} disabled={saving} className="btn-gold w-full py-2.5 shadow-lg shadow-amber-950/20" type="button">
                {saving ? <Spinner /> : <Save size={15} />}
                {saving ? "Đang lưu..." : "Lưu vào Content"}
              </button>
            </div>
          ) : (
            !loading && (
              <div className="mt-4 rounded-xl border-2 border-dashed border-[var(--border)] py-10 px-5 flex flex-col items-center text-center gap-2">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-[var(--panel2)]">
                  <Sparkles size={20} className="text-slate-500" />
                </div>
                <div className="text-xs font-semibold text-slate-400">Chưa có kết quả</div>
                <p className="text-[11px] text-slate-500 max-w-[220px]">
                  Nhập chủ đề bên trái rồi nhấn "Tạo content với AI" để bắt đầu.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-[10px] text-slate-500 block">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1 text-xs">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Box({
  icon: Icon,
  title,
  text,
  onCopy,
  children,
}: {
  icon: any;
  title: string;
  text: string;
  onCopy: (label: string, text: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--panel2)] border border-[var(--border)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
          <Icon size={14} /> {title}
        </div>
        <button
          type="button"
          onClick={() => onCopy(title, text)}
          className="text-slate-500 hover:text-white transition p-1 -m-1"
          title={`Sao chép ${title}`}
        >
        </button>
      </div>
      <div className="text-xs text-slate-300 leading-5 mt-2">{children}</div>
    </div>
  );
}