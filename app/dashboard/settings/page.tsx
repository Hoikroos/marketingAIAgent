"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/page-shell";
import ClientGuard from "@/components/ClientGuard";
import {
  Save,
  KeyRound,
  Bell,
  Check,
  Building2,
  Zap,
  ZapOff,
  Upload,
  Trash2,
  Share2,
  Bot,
  User,
  Phone,
  Mail,
  Tag,
  Code2,
  BarChart3,
  Info,
  Calendar,
  Eye,
  EyeOff,
  Globe,
  Cpu,
  Wifi,
  Clock,
  Play,
} from "@/components/icons";
import { Field, Spinner, Toggle } from "@/components/ui";
import { useToast } from "@/components/toast";
import PasswordInput from "@/components/PasswordInput";
import Swal from "sweetalert2";
import SocialChannelsManager from "@/components/SocialChannelsManager";

// AI Providers configuration - Free tiers available
const AI_PROVIDERS: Record<
  string,
  {
    name: string;
    models: string[];
    endpoint: string;
    placeholder: string;
    free: boolean;
  }
> = {
  groq: {
    name: "Groq",
    free: true,
    models: [
      "openai/gpt-oss-120b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision-preview",
      "llama-3.2-3b-preview",
      "llama-3.2-1b-preview",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    endpoint: "https://api.groq.com/openai/v1",
    placeholder: "Nhập API Key...",
  },
  gemini: {
    name: "Google Gemini",
    free: true,
    models: [
      "gemini-3.6-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
    ],
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    placeholder: "Nhập API Key...",
  },
  deepseek: {
    name: "DeepSeek",
    free: true,
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    endpoint: "https://api.deepseek.com/v1",
    placeholder: "Nhập API Key...",
  },
  mistral: {
    name: "Mistral",
    free: true,
    models: [
      "mistral-large-latest",
      "mistral-small-latest",
      "pixtral-12b-2409",
      "open-mistral-7b",
      "open-mixtral-8x7b",
    ],
    endpoint: "https://api.mistral.ai/v1",
    placeholder: "Nhập API Key...",
  },
  openrouter: {
    name: "OpenRouter",
    free: true,
    models: [
      // ✅ Model free đang hoạt động (đã test) — phản hồi chậm ~90-150s
      "nvidia/nemotron-3.5-lightning:free",
      // Model trả phí (nhanh hơn nhiều — cần nạp credit OpenRouter)
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-chat",
      "mistralai/mistral-7b-instruct",
      "microsoft/phi-3-medium-128k-instruct",
    ],
    endpoint: "https://openrouter.ai/api/v1",
    placeholder: "Nhập API Key...",
  },

  anthropic: {
    name: "Anthropic Claude",
    free: false,
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    endpoint: "https://api.anthropic.com/v1",
    placeholder: "Nhập API Key...",
  },

  cline: {
    name: "Cline",
    free: true,
    models: ["minimax/minimax-m2.5"],
    endpoint: "https://api.cline.bot/api/v1",
    placeholder: "Nhập API Key...",
  },
};

type SettingsData = {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  brandColor: string;
  slogan: string;
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  aiKeys?: Record<string, string>;
  notifyLead: boolean;
  notifyTask: boolean;
  notifyReport: boolean;
  notifyContent: boolean;
  metaPixelId: string;
  ga4Id: string;
  followUpDays: string;
  autoReminders: boolean;
  weeklyReport: boolean;
  cronSecret: string;
  logoUrl?: string | null;
  assistantLogoUrl?: string | null;
};

/** Input có icon bên trái, và có thể có badge/nút phụ bên phải */
function IconInput({
  icon: Icon,
  right,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: any;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        {...props}
        style={{
          paddingLeft: "2.25rem",
          paddingRight: right ? "6.5rem" : undefined,
        }}
        className={`input ${className}`}
      />
      {right && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {right}
        </div>
      )}
    </div>
  );
}

/** Nhãn nhỏ báo trạng thái đã lưu / chưa lưu cho một field, dựa trên so sánh với giá trị đã lưu gần nhất */
function SavedChip({
  value,
  savedValue,
}: {
  value?: string;
  savedValue?: string;
}) {
  if (!value) return null;
  if (value === savedValue) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500 whitespace-nowrap">
        <Check size={11} /> Đã lưu
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--panel)] text-slate-400 whitespace-nowrap">
      Chưa lưu
    </span>
  );
}

/** Minh hoạ nhỏ cho khối Kênh mạng xã hội — điện thoại + biểu tượng MXH */
function SocialIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 150"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="52"
        y="10"
        width="58"
        height="112"
        rx="14"
        fill="#ffffff"
        stroke="#d7ecf9"
        strokeWidth="2"
      />
      <rect x="60" y="22" width="42" height="78" rx="4" fill="#eaf6ff" />
      <circle cx="81" cy="108" r="4" fill="#bfe3f7" />
      <circle cx="26" cy="40" r="18" fill="#1877F2" />
      <path
        d="M29 49V41h5l1-6h-6v-4c0-2 1-3 3-3h3v-6h-5c-5 0-8 3-8 8v5h-4v6h4v8z"
        fill="#fff"
      />
      <circle cx="120" cy="62" r="18" fill="#111827" />
      <path
        d="M126 50c-1 2-3 3-5 3 0-2-1-4-3-5-2-1-5-1-6 1-2 2-2 5 0 7 1 1 3 2 5 2v11c0 3-2 5-5 5s-5-2-5-5"
        stroke="#fff"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="33" cy="112" r="17" fill="#FF0000" />
      <path d="M27 105l11 7-11 7z" fill="#fff" />
      <circle cx="120" cy="118" r="4" fill="#22c55e" />
    </svg>
  );
}

/** Minh hoạ nhỏ cho khối Website & Tracking — cột dữ liệu tăng trưởng */
function AnalyticsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="14"
        width="86"
        height="112"
        rx="10"
        fill="#ffffff"
        stroke="#d7ecf9"
        strokeWidth="2"
      />
      <rect x="24" y="76" width="10" height="34" rx="2" fill="#bfe3f7" />
      <rect x="40" y="60" width="10" height="50" rx="2" fill="#7cc6ec" />
      <rect x="56" y="42" width="10" height="68" rx="2" fill="#1b98e0" />
      <path
        d="M22 56 L40 44 L58 50 L76 26"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M68 26 L76 26 L76 34"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle
        cx="118"
        cy="46"
        r="26"
        fill="#eaf6ff"
        stroke="#bfe3f7"
        strokeWidth="2"
      />
      <path
        d="M118 46 L118 22 A24 24 0 0 1 140 58 Z"
        fill="#1b98e0"
        opacity="0.85"
      />
      <path
        d="M118 46 L140 58 A24 24 0 0 1 100 55 Z"
        fill="#22c55e"
        opacity="0.75"
      />
      <rect
        x="98"
        y="92"
        width="46"
        height="34"
        rx="8"
        fill="#ffffff"
        stroke="#d7ecf9"
        strokeWidth="2"
      />
      <rect x="106" y="102" width="30" height="4" rx="2" fill="#bfe3f7" />
      <rect x="106" y="110" width="20" height="4" rx="2" fill="#bfe3f7" />
    </svg>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [initial, setInitial] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [jobsRunning, setJobsRunning] = useState(false);
  const [showCron, setShowCron] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setData(res.settings);
          setInitial(res.settings);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
  }

  const dirty =
    !!data && !!initial && JSON.stringify(data) !== JSON.stringify(initial);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.ok)
        throw new Error(result.error || "Lưu thất bại");
      toast.success("Đã lưu cấu hình", "Thông tin hệ thống đã được cập nhật.");
      setInitial(data);
      setSavedAt(new Date());
    } catch (err: any) {
      toast.error("Không thể lưu cấu hình", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  const aiProvider = data?.aiProvider || "groq";
  const providerModels = AI_PROVIDERS[aiProvider]?.models || [];
  const providerEndpoint = AI_PROVIDERS[aiProvider]?.endpoint || "";
  const providerKey = data?.aiKeys?.[aiProvider] || "";
  const aiConfigured =
    !!providerKey ||
    !!data?.aiApiKey ||
    !!data?.geminiApiKey ||
    !!data?.openaiApiKey;

  /** Đổi key cho provider đang chọn (mỗi provider 1 key riêng, không ghi đè lẫn nhau) */
  function setProviderKey(value: string) {
    setData((d) =>
      d ? { ...d, aiKeys: { ...(d.aiKeys || {}), [aiProvider]: value } } : d,
    );
  }

  /** Kiểm tra kết nối AI ngay với provider/model/key hiện tại (phải Lưu trước) */
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  async function testAI() {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const d = await res.json();
      if (d.ok) {
        setAiTestResult({ ok: true, text: "Kết nối thành công" });
        toast.success(
          "AI hoạt động!",
          `${d.provider} · ${d.model} · ${d.latencyMs}ms — trả lời: "${d.reply}"`,
        );
      } else {
        setAiTestResult({ ok: false, text: d.error || "Kết nối thất bại" });
        toast.error("AI chưa kết nối được", d.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setAiTestResult({ ok: false, text: "Kết nối thất bại" });
      toast.error("AI chưa kết nối được", err.message || String(err));
    } finally {
      setAiTesting(false);
    }
  }

  /** Chọn ảnh → upload → lưu logo tùy chỉnh */
  async function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Tải logo thất bại");
      toast.success("Đã cập nhật logo", "Logo mới đã được áp dụng.");
      setData((prev) => (prev ? { ...prev, logoUrl: d.url } : prev));
      setInitial((prev) => (prev ? { ...prev, logoUrl: d.url } : prev));
      window.dispatchEvent(new Event("brand:refresh"));
    } catch (err: any) {
      toast.error("Không tải được logo", err.message || String(err));
    } finally {
      setLogoBusy(false);
    }
  }

  /** Xoá logo tùy chỉnh → trở về logo mặc định */
  async function removeLogo() {
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá logo thất bại");
      toast.success("Đã xoá logo", "Đã trở về logo mặc định.");
      setData((prev) => (prev ? { ...prev, logoUrl: null } : prev));
      setInitial((prev) => (prev ? { ...prev, logoUrl: null } : prev));
      window.dispatchEvent(new Event("brand:refresh"));
    } catch (err: any) {
      toast.error("Không xoá được logo", err.message || String(err));
    }
  }

  /** Logo CHATBOT: chọn ảnh → upload → lưu (dùng trong khung Trợ lý AI) */
  const [botLogoBusy, setBotLogoBusy] = useState(false);
  async function pickBotLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBotLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/assistant-logo", {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!res.ok || !d.ok)
        throw new Error(d.error || "Tải logo chatbot thất bại");
      toast.success(
        "Đã cập nhật logo chatbot",
        "Logo mới sẽ hiển thị trong khung Trợ lý AI.",
      );
      setData((prev) => (prev ? { ...prev, assistantLogoUrl: d.url } : prev));
      setInitial((prev) =>
        prev ? { ...prev, assistantLogoUrl: d.url } : prev,
      );
      window.dispatchEvent(new Event("brand:refresh"));
    } catch (err: any) {
      toast.error("Không tải được logo chatbot", err.message || String(err));
    } finally {
      setBotLogoBusy(false);
    }
  }

  /** Xoá logo chatbot → trở về icon mặc định */
  async function removeBotLogo() {
    setBotLogoBusy(true);
    try {
      const res = await fetch("/api/settings/assistant-logo", {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok || !d.ok)
        throw new Error(d.error || "Xoá logo chatbot thất bại");
      toast.success("Đã xoá logo chatbot", "Trợ lý AI trở về icon mặc định.");
      setData((prev) => (prev ? { ...prev, assistantLogoUrl: null } : prev));
      setInitial((prev) => (prev ? { ...prev, assistantLogoUrl: null } : prev));
      window.dispatchEvent(new Event("brand:refresh"));
    } catch (err: any) {
      toast.error("Không xoá được logo chatbot", err.message || String(err));
    } finally {
      setBotLogoBusy(false);
    }
  }

  /** Chạy ngay các tác vụ tự động (nhắc đăng bài, follow-up, báo cáo tuần) */
  async function runAutomationNow() {
    setJobsRunning(true);
    try {
      const res = await fetch("/api/automation/run", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Lỗi");
      const r = d.results || {};
      toast.success(
        "Đã chạy tác vụ tự động",
        `Nhắc đăng bài: ${r.reminders ?? 0} · Follow-up lead: ${r.followups ?? 0} · Báo cáo tuần: ${r.weekly ? "đã tạo" : "đã tồn tại/bỏ qua"}`,
      );
    } catch (e: any) {
      toast.error("Chạy tác vụ thất bại", e.message || String(e));
    } finally {
      setJobsRunning(false);
    }
  }

  return (
    <ClientGuard perm="settings">
      <PageShell
        title="Cài đặt hệ thống"
        subtitle="Quản lý cấu hình và tùy chỉnh"
      >
        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner size={24} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 max-w-6xl">
            {/* Company Info + Logo */}
            <SettingCard
              title="Thông tin công ty"
              desc="Logo, tên, slogan hiển thị trên hệ thống"
              icon={Building2}
              iconTone="text-violet-500 bg-violet-500/10"
              glow="bg-violet-400"
            >
              {/* Logo & Preview */}
              <div className="flex items-center gap-4 mb-5">
                <div className="h-16 w-16 rounded-2xl bg-[var(--panel2)] border border-dashed border-[var(--border-soft)] grid place-items-center text-slate-400 overflow-hidden shrink-0">
                  {data?.logoUrl ? (
                    <img
                      src={data.logoUrl}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 size={26} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base truncate">
                    {data?.companyName || "Tên công ty"}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {data?.slogan || "Slogan của bạn"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <label className="btn-primary text-xs cursor-pointer rounded-full">
                    {logoBusy ? <Spinner size={13} /> : <Upload size={14} />}{" "}
                    Tải lên
                    <input
                      type="file"
                      accept="image/*"
                      onChange={pickLogo}
                      className="hidden"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      PNG, JPG (tối đa 2MB)
                    </span>
                    {data?.logoUrl && (
                      <button
                        onClick={removeLogo}
                        className="text-rose-400 hover:text-rose-300 transition"
                        title="Xoá logo"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Tên công ty</label>
                  <IconInput
                    icon={User}
                    value={data?.companyName || ""}
                    onChange={(e) => set("companyName", e.target.value)}
                    placeholder="Tân Phú Land"
                  />
                </div>
                <div>
                  <label className="field-label">Số điện thoại</label>
                  <IconInput
                    icon={Phone}
                    value={data?.companyPhone || ""}
                    onChange={(e) => set("companyPhone", e.target.value)}
                    placeholder="09xx xxx xxx"
                  />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <IconInput
                    icon={Mail}
                    type="email"
                    value={data?.companyEmail || ""}
                    onChange={(e) => set("companyEmail", e.target.value)}
                    placeholder="contact@company.vn"
                  />
                </div>
                <div>
                  <label className="field-label">Slogan</label>
                  <IconInput
                    icon={Tag}
                    value={data?.slogan || ""}
                    onChange={(e) => set("slogan", e.target.value)}
                    placeholder="Khẩu hiệu công ty"
                  />
                </div>
              </div>
            </SettingCard>

            {/* Website & Tracking */}
            <SettingCard
              title="Website & Tracking"
              desc="Meta Pixel và Google Analytics 4 — chèn vào toàn bộ website"
              icon={BarChart3}
              iconTone="text-emerald-500 bg-emerald-500/10"
              glow="bg-emerald-400"
              illustration={<AnalyticsIllustration className="w-24 h-24" />}
            >
              <div className="space-y-4 sm:pr-20">
                <div>
                  <label className="field-label">Meta Pixel ID</label>
                  <IconInput
                    icon={Code2}
                    className="font-mono text-xs"
                    value={data?.metaPixelId || ""}
                    onChange={(e) => set("metaPixelId", e.target.value)}
                    placeholder="VD: 1234567890123456"
                    right={
                      <SavedChip
                        value={data?.metaPixelId}
                        savedValue={initial?.metaPixelId}
                      />
                    }
                  />
                </div>
                <div>
                  <label className="field-label">
                    Google Analytics 4 (Measurement ID)
                  </label>
                  <IconInput
                    icon={BarChart3}
                    className="font-mono text-xs"
                    value={data?.ga4Id || ""}
                    onChange={(e) => set("ga4Id", e.target.value)}
                    placeholder="VD: G-XXXXXXXXXX"
                    right={
                      <SavedChip
                        value={data?.ga4Id}
                        savedValue={initial?.ga4Id}
                      />
                    }
                  />
                </div>
                <div className="flex gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/15">
                  <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400">
                    Nhập ID và bấm Lưu — mã theo dõi sẽ tự động chèn vào mọi
                    trang của website. Dùng cùng UTM Builder để biết lead đến từ
                    chiến dịch nào.
                  </p>
                </div>
              </div>
            </SettingCard>

            {/* Tự động hoá */}
            <SettingCard
              title="Tự động hoá"
              desc="Nhắc đăng bài, follow-up lead cũ, báo cáo tuần"
              icon={Bell}
              iconTone="text-amber-500 bg-amber-500/10"
              glow="bg-amber-400"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel2)]">
                  <div className="h-9 w-9 rounded-full bg-sky-500/15 text-sky-500 grid place-items-center shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      Nhắc đăng bài trước 24 giờ
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Gửi thông báo nhắc đăng bài theo lịch đã thiết lập
                    </div>
                  </div>
                  <Toggle
                    checked={data?.autoReminders ?? true}
                    onChange={(v) => set("autoReminders", v)}
                    label=""
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel2)]">
                  <div className="h-9 w-9 rounded-full bg-sky-500/15 text-sky-500 grid place-items-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      Báo cáo tuần tự động (gửi vào đầu tuần)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tổng hợp và gửi báo cáo qua email
                    </div>
                  </div>
                  <Toggle
                    checked={data?.weeklyReport ?? true}
                    onChange={(v) => set("weeklyReport", v)}
                    label=""
                  />
                </div>

                <div>
                  <label className="field-label">
                    Follow-up lead sau (ngày)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      className="input"
                      style={{ paddingRight: "3rem" }}
                      value={data?.followUpDays || "3"}
                      onChange={(e) => set("followUpDays", e.target.value)}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      ngày
                    </span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    Cron Secret (chỉ dùng khi muốn hẹn giờ từ dịch vụ ngoài —
                    tuỳ chọn)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type={showCron ? "text" : "password"}
                        className="input font-mono text-xs"
                        style={{
                          paddingLeft: "2.25rem",
                          paddingRight: "2.25rem",
                        }}
                        value={data?.cronSecret || ""}
                        onChange={(e) => set("cronSecret", e.target.value)}
                        placeholder="Bấm Tạo để sinh key bí mật"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCron((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                        title={showCron ? "Ẩn" : "Hiện"}
                      >
                        {showCron ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost text-xs shrink-0"
                      onClick={() =>
                        set(
                          "cronSecret",
                          Math.random().toString(36).slice(2) +
                            Math.random().toString(36).slice(2),
                        )
                      }
                    >
                      Tạo mới
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    ✅ Tự động đã bật: server tự chạy các tác vụ mỗi 1 phút —
                    thông báo đẩy ra ngay khi đến mốc,{" "}
                    <b>không cần cron ngoài hay Cron Secret</b>. Vẫn có thể hẹn
                    giờ từ dịch vụ ngoài (VD cron-job.org) gọi{" "}
                    <code className="text-[#1b98e0]">
                      GET /api/cron?key=CRON_SECRET
                    </code>{" "}
                    nếu muốn, hoặc bấm &quot;Chạy ngay&quot; để chạy thủ công.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={runAutomationNow}
                    disabled={jobsRunning}
                    className="btn-primary text-xs h-[38px]"
                    type="button"
                  >
                    {jobsRunning ? <Spinner size={13} /> : <Play size={13} />}
                    {jobsRunning ? "Đang chạy..." : "Chạy ngay"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs h-[38px]"
                    onClick={() =>
                      toast.success(
                        "Lịch sử chạy",
                        "Tính năng xem lịch sử chi tiết đang được phát triển.",
                      )
                    }
                  >
                    <Clock size={13} /> Xem lịch sử chạy
                  </button>
                </div>
              </div>
            </SettingCard>

            {/* AI Configuration */}
            <SettingCard
              title="AI & Tự động hóa"
              desc="Cấu hình nhà cung cấp AI và bộ tạo nội dung"
              icon={Bot}
              iconTone="text-sky-500 bg-sky-500/10"
              glow="bg-sky-400"
              badge={
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${aiConfigured ? "text-emerald-500 bg-emerald-500/10" : "text-slate-500 bg-[var(--panel2)]"}`}
                >
                  {aiConfigured ? <Zap size={11} /> : <ZapOff size={11} />}
                  {aiConfigured ? "Đã kết nối" : "Chưa cấu hình"}
                </span>
              }
            >
              <div className="space-y-4">
                {/* Logo chatbot */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel2)] border border-[var(--border-soft)]">
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-lg bg-gradient-to-br from-[#1b98e0] to-violet-500 grid place-items-center">
                    {data?.assistantLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.assistantLogoUrl}
                        alt="Logo chatbot"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Bot size={24} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">Logo chatbot</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Hiển thị làm avatar của Trợ lý AI trong khung chat. Logo
                      công ty đã có ở phần Thương hiệu bên trên.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <label
                        className={`btn-ghost text-[10px] px-2.5 py-1.5 inline-flex items-center gap-1 cursor-pointer ${botLogoBusy ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {botLogoBusy ? (
                          <Spinner size={11} />
                        ) : (
                          <Upload size={11} />
                        )}
                        {data?.assistantLogoUrl ? "Đổi logo" : "Tải logo lên"}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                          className="hidden"
                          onChange={pickBotLogo}
                        />
                      </label>
                      {data?.assistantLogoUrl && (
                        <button
                          onClick={removeBotLogo}
                          disabled={botLogoBusy}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition inline-flex items-center gap-1"
                          type="button"
                        >
                          <Trash2 size={11} /> Xoá
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Nhà cung cấp AI</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => {
                        const defaults = AI_PROVIDERS[e.target.value];
                        setData((d) =>
                          d
                            ? {
                                ...d,
                                aiProvider: e.target.value,
                                // Model mặc định của provider mới; endpoint để trống = tự dùng mặc định
                                aiModel: defaults?.models[0] || d.aiModel,
                                aiEndpoint: "",
                              }
                            : d,
                        );
                      }}
                      className="input"
                    >
                      {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                        <option key={key} value={key}>
                          {p.name} {p.free ? "(Free)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">AI Model</label>
                    <IconInput
                      icon={Cpu}
                      className="font-mono text-xs"
                      list="ai-model-options"
                      value={data?.aiModel || ""}
                      onChange={(e) => set("aiModel", e.target.value)}
                      placeholder={providerModels[0] || "Tên model..."}
                    />
                    <datalist id="ai-model-options">
                      {providerModels.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 -mt-2">
                  Chọn từ gợi ý hoặc gõ tên model bất kỳ của nhà cung cấp.
                </p>

                <Field label="API Key">
                  <PasswordInput
                    placeholder={
                      AI_PROVIDERS[aiProvider]?.placeholder || "Nhập API Key..."
                    }
                    value={providerKey}
                    onChange={(e) => setProviderKey(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Mỗi nhà cung cấp có key riêng — đổi qua lại không mất key
                    cũ.
                  </p>
                </Field>

                <div>
                  <label className="field-label">API Base URL (tuỳ chọn)</label>
                  <IconInput
                    icon={Globe}
                    className="font-mono text-xs"
                    value={data?.aiEndpoint || ""}
                    onChange={(e) => set("aiEndpoint", e.target.value)}
                    placeholder={providerEndpoint || "https://..."}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Để trống = dùng mặc định của nhà cung cấp (
                    {providerEndpoint}).
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <button
                    onClick={testAI}
                    disabled={aiTesting}
                    className="btn-ghost text-xs"
                    type="button"
                  >
                    {aiTesting ? <Spinner size={13} /> : <Wifi size={13} />}
                    {aiTesting ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                  </button>
                  {aiTestResult ? (
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-medium ${aiTestResult.ok ? "text-emerald-500" : "text-rose-400"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${aiTestResult.ok ? "bg-emerald-500" : "bg-rose-400"}`}
                      />
                      {aiTestResult.text}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Nhớ bấm <b>Lưu cấu hình</b> trước khi kiểm tra.
                    </span>
                  )}
                </div>
              </div>
            </SettingCard>

            {/* Notifications */}
            <SettingCard
              title="Thông báo"
              desc="Chọn sự kiện hệ thống sẽ báo cho bạn"
              icon={Bell}
              iconTone="text-rose-500 bg-rose-500/10"
              glow="bg-rose-400"
            >
              <div className="rounded-2xl border border-[var(--border-soft)] overflow-hidden">
                <div className="grid sm:grid-cols-2">
                  <div className="px-4 py-3.5 border-b border-[var(--border-soft)] sm:border-r">
                    <Toggle
                      label="Có lead được phân cho nhân viên"
                      checked={data?.notifyLead || false}
                      onChange={(v) => set("notifyLead", v)}
                    />
                  </div>
                  <div className="px-4 py-3.5 border-b border-[var(--border-soft)]">
                    <Toggle
                      label="Có báo cáo công việc mới"
                      checked={data?.notifyReport || false}
                      onChange={(v) => set("notifyReport", v)}
                    />
                  </div>
                  <div className="px-4 py-3.5 sm:border-r border-[var(--border-soft)]">
                    <Toggle
                      label="Có task được giao"
                      checked={data?.notifyTask || false}
                      onChange={(v) => set("notifyTask", v)}
                    />
                  </div>
                  <div className="px-4 py-3.5">
                    <Toggle
                      label="Có nội dung mới được tạo"
                      checked={data?.notifyContent || false}
                      onChange={(v) => set("notifyContent", v)}
                    />
                  </div>
                </div>
              </div>
            </SettingCard>

            {/* Social Channels */}
            <SettingCard
              title="Kênh mạng xã hội"
              desc="Quản lý các kênh MXH để nhập số liệu báo cáo"
              icon={Share2}
              iconTone="text-emerald-500 bg-emerald-500/10"
              glow="bg-emerald-400"
              illustration={<SocialIllustration className="w-24 h-24" />}
            >
              <div className="sm:pr-20">
                <SocialChannelsManager />
              </div>
            </SettingCard>

            {/* Save Button - Full Width */}
            <div className="lg:col-span-2 sticky bottom-4 flex justify-end">
              <div className="glass rounded-full shadow-lg border border-[var(--border-soft)] px-4 py-2 flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {dirty
                    ? "Bạn có thay đổi chưa lưu"
                    : savedAt
                      ? `Đã lưu lúc ${savedAt.toLocaleTimeString("vi-VN")}`
                      : "Chưa có thay đổi"}
                </span>
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  type="button"
                >
                  {saving ? (
                    <Spinner size={14} />
                  ) : dirty ? (
                    <Save size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                  {saving ? "Đang lưu..." : dirty ? "Lưu cấu hình" : "Đã lưu"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </ClientGuard>
  );
}

function SettingCard({
  title,
  desc,
  icon: Icon,
  iconTone,
  glow,
  badge,
  illustration,
  children,
}: {
  title: string;
  desc?: string;
  icon: any;
  iconTone?: string;
  glow?: string;
  badge?: React.ReactNode;
  illustration?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative card p-5 sm:p-6 animate-in border border-[var(--border-soft)] overflow-hidden rounded-3xl">
      {glow && (
        <div
          className={`pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-[0.12] ${glow}`}
        />
      )}
      {illustration && (
        <div className="pointer-events-none absolute right-4 bottom-4 opacity-90 hidden sm:block">
          {illustration}
        </div>
      )}
      <div className="relative z-[1] flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconTone || "text-violet-500 bg-[#1b98e0]/10"}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-sm">{title}</h2>
          {desc && <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>}
        </div>
        {badge}
      </div>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
