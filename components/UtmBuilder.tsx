"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./toast";
import { Field } from "./ui";
import { Link2, Check, ExternalLink } from "./icons";

const PLATFORM_PRESETS: Record<string, { source: string; medium: string }> = {
  Facebook: { source: "facebook", medium: "paid_social" },
  TikTok: { source: "tiktok", medium: "paid_social" },
  Google: { source: "google", medium: "cpc" },
  Zalo: { source: "zalo", medium: "oa" },
  Email: { source: "email", medium: "newsletter" },
  QR: { source: "qr", medium: "offline" },
};

export default function UtmBuilder() {
  const toast = useToast();
  const [baseUrl, setBaseUrl] = useState("https://");
  const [platform, setPlatform] = useState("Facebook");
  const [source, setSource] = useState("facebook");
  const [medium, setMedium] = useState("paid_social");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [campaigns, setCampaigns] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCampaigns(d.map((c: any) => c.name).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const finalUrl = useMemo(() => {
    if (!baseUrl.trim() || !baseUrl.startsWith("http")) return "";
    try {
      const u = new URL(baseUrl.trim());
      if (source.trim()) u.searchParams.set("utm_source", source.trim());
      if (medium.trim()) u.searchParams.set("utm_medium", medium.trim());
      if (campaign.trim()) u.searchParams.set("utm_campaign", campaign.trim());
      if (content.trim()) u.searchParams.set("utm_content", content.trim());
      if (term.trim()) u.searchParams.set("utm_term", term.trim());
      return u.toString();
    } catch {
      return "";
    }
  }, [baseUrl, source, medium, campaign, content, term]);

  function applyPlatform(p: string) {
    setPlatform(p);
    const preset = PLATFORM_PRESETS[p];
    if (preset) {
      setSource(preset.source);
      setMedium(preset.medium);
    }
  }

  async function copy() {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã copy link UTM", "Dán vào quảng cáo/bài đăng để đo lường lead");
    } catch {
      toast.error("Copy thất bại", "Hãy copy thủ công từ ô link");
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
      {/* Form */}
      <div className="card p-5 space-y-4">
        <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
          <Link2 size={15} className="text-[#1b98e0]" /> THÔNG SỐ LINK
        </div>
        <Field label="Link đích * (trang đích dẫn khách về)">
          <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://tanphuland.vn/danh-gia-tin-dang" />
        </Field>
        <div>
          <label className="field-label">Nền tảng (tự điền source/medium)</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(PLATFORM_PRESETS).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  platform === p ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="utm_source *">
            <input className="input font-mono text-xs" value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
          <Field label="utm_medium *">
            <input className="input font-mono text-xs" value={medium} onChange={(e) => setMedium(e.target.value)} />
          </Field>
        </div>
        <Field label="utm_campaign * (chọn chiến dịch đang chạy hoặc nhập mới)">
          <input
            className="input"
            list="campaign-list"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="VD: chung-cu-q9-thang9"
          />
          <datalist id="campaign-list">
            {campaigns.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="utm_content (phân biệt mẫu quảng cáo)">
            <input className="input font-mono text-xs" value={content} onChange={(e) => setContent(e.target.value)} placeholder="video-a / anh-b" />
          </Field>
          <Field label="utm_term (từ khoá, nếu có)">
            <input className="input font-mono text-xs" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="mua nha quan 9" />
          </Field>
        </div>
      </div>

      {/* Kết quả */}
      <div className="space-y-4">
        <div className="card p-5">
          <div className="font-extrabold text-sm tracking-tight mb-3">LINK HOÀN CHỈNH</div>
          <div className="rounded-lg bg-[var(--panel2)] p-3 font-mono text-[11px] break-all min-h-[84px] text-slate-300">
            {finalUrl || <span className="text-slate-500">Nhập link đích để tạo link UTM...</span>}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={copy} disabled={!finalUrl} className="btn-primary text-xs flex-1" type="button">
              {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? "Đã copy!" : "Copy link"}
            </button>
            <a
              href={finalUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className={`btn-ghost text-xs flex items-center gap-1 ${!finalUrl ? "pointer-events-none opacity-40" : ""}`}
            >
              <ExternalLink size={14} /> Mở thử
            </a>
          </div>
        </div>

        <div className="card p-5 text-xs text-slate-400 space-y-2">
          <div className="font-extrabold text-sm text-slate-200 mb-2">CÁCH DÙNG</div>
          <p>1. Dán link UTM vào quảng cáo/bài đăng (thay cho link thường).</p>
          <p>2. Khách bấm link → form thu lead đọc UTM từ URL và gửi kèm lead.</p>
          <p>3. Trong bảng Leads, mỗi lead có nhãn <span className="px-1 rounded bg-violet-500/15 text-violet-300">UTM: chiến-dịch</span> → biết chính xác lead đến từ đâu.</p>
          <p className="text-slate-500">Kết hợp Meta Pixel/GA4 trong Cài đặt để đo thêm lượt xem &amp; chuyển đổi.</p>
        </div>
      </div>
    </div>
  );
}