"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "./toast";
import { Spinner } from "./ui";
import Modal from "./Modal";
import {
  Bot,
  Sparkles,
  Check,
  Trash2,
  Plus,
  MessageCircle,
  Menu,
  X,
  Share2,
  Eye,
  Users,
  Search,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Send,
  BarChart3,
  PenLine,
  TrendingUp,
  Lightbulb,
  Building2,
} from "./icons";
import { useBrand } from "./BrandProvider";
import Swal from "sweetalert2";

type Attach = { url: string; name: string; type: "image" | "file"; size?: number };
type Msg = { role: "user" | "ai"; text: string; time?: string; userName?: string; attachments?: Attach[] };
type Conv = { id: number; title: string; updatedAt: string; shared?: boolean; userName?: string | null };

const SUGGESTIONS: { text: string; icon: any }[] = [
  { text: "Tuần này tôi nên ưu tiên việc gì?", icon: BarChart3 },
  { text: "Nội dung nào nên làm thêm?", icon: PenLine },
  { text: "Chiến dịch quảng cáo nào nên tắt?", icon: TrendingUp },
  { text: "So sánh kênh TikTok vs Facebook", icon: Lightbulb },
];

function RichText({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const isBullet = /^\s*[•\-*]\s+/.test(line);
        const clean = line.replace(/^\s*[•\-*]\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*)/g);
        const content = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j} className="font-bold">{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>
        );
        return isBullet ? (
          <div key={i} className="flex gap-1.5">
            <span className="text-[#1b98e0] mt-0.5 shrink-0 text-[11px]">•</span>
            <span>{content}</span>
          </div>
        ) : (
          <p key={i}>{content}</p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 px-1 py-2">
      {[0, 150, 300].map((d) => (
        <span key={d} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: d + "ms" }} />
      ))}
    </div>
  );
}

/** Avatar chatbot — ưu tiên LOGO CHATBOT do admin upload, sau đó LOGO CÔNG TY (hệ thống), cuối cùng icon gradient */
function BotAvatar({ size = 24, iconSize = 12, icon = "bot" }: { size?: number; iconSize?: number; icon?: "bot" | "sparkles" }) {
  const { assistantLogoUrl, logoUrl, companyName } = useBrand();
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setMounted(true), []);
  // 1) Logo chatbot riêng (Cài đặt → AI & Tự động hóa → Logo chatbot)
  // 2) Logo công ty Tân Phú Land (Cài đặt → Thương hiệu)
  // 3) Icon gradient mặc định
  const src = mounted ? (assistantLogoUrl || logoUrl || "") : "";
  const useImg = !!src && !failed;
  const Icon = icon === "sparkles" ? Sparkles : Bot;
  return (
    <div
      className={`rounded-lg grid place-items-center shrink-0 shadow overflow-hidden ${useImg ? "bg-white" : "bg-gradient-to-br from-[#1b98e0] to-violet-500"}`}
      style={{ width: size, height: size }}
      title={assistantLogoUrl ? "Logo chatbot (đổi trong Cài đặt hệ thống)" : logoUrl ? `Logo ${companyName || "công ty"} (Cài đặt → Thương hiệu)` : undefined}
    >
      {useImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Logo chatbot" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Icon size={iconSize} className="text-white" />
      )}
    </div>
  );
}

function fmtTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDivider(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? "Hôm nay " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtRel(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return m + " phút trước";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " giờ trước";
  const d = Math.floor(h / 24);
  if (d < 7) return d + " ngày trước";
  return new Date(iso).toLocaleDateString("vi-VN");
}

/** Bảng xây nhà nhỏ dùng làm hình minh hoạ — vẽ bằng SVG để không phụ thuộc ảnh ngoài */
function CityIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="120" width="300" height="40" fill="url(#ground)" />
      <rect x="18" y="70" width="34" height="70" rx="2" fill="#e5f1fb" />
      <rect x="58" y="45" width="40" height="95" rx="2" fill="#cfe6f8" />
      <rect x="104" y="90" width="30" height="50" rx="2" fill="#e5f1fb" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={64 + (i % 2) * 16} y={54 + Math.floor(i / 2) * 20} width="8" height="10" fill="#1b98e0" opacity="0.55" />
      ))}
      <path d="M150 140V96l45-32 45 32v44z" fill="#ffffff" stroke="#1b98e0" strokeWidth="2.5" />
      <path d="M143 100 195 60 247 100" stroke="#1b98e0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="180" y="110" width="16" height="30" fill="#1b98e0" opacity="0.85" />
      <rect x="204" y="108" width="14" height="14" fill="#cfe6f8" />
      <circle cx="260" cy="34" r="16" fill="#ffd166" opacity="0.9" />
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf4fc" />
          <stop offset="1" stopColor="#dcebf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AssistantChat() {
  const toast = useToast();
  const { companyName, logoUrl } = useBrand();
  const assistantName = `Trợ lý AI ${companyName || "Tân Phú Land Marketing"}`;
  // Logo công ty hiển thị lỗi → rơi về icon Building2
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  useEffect(() => setBrandLogoFailed(false), [logoUrl]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [sharedConvs, setSharedConvs] = useState<Conv[]>([]);
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  // Đoạn chat đang mở: null mine = của tôi; nếu là đoạn chat người khác thì chỉ xem
  const [viewing, setViewing] = useState<{ mine: boolean; shared: boolean; ownerName: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  // Đính kèm file / hình ảnh
  const [attaching, setAttaching] = useState<Attach[]>([]);
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // Cài đặt Trợ lý AI (chỉ Admin)
  const [canEditAss, setCanEditAss] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [assCfg, setAssCfg] = useState({ model: "", temperature: 0.5, maxTokens: 2000, useData: true, endpoint: "", keyMasked: "", hasKey: false });
  const [assKeyInput, setAssKeyInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Nạp cài đặt Trợ lý AI (ai có quyền Trợ lý cũng đọc được; Admin mới thấy nút sửa)
  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/assistant/settings").then((r) => r.json());
        if (d.ok) {
          setAssCfg(d.settings);
          setCanEditAss(!!d.canEdit);
        }
      } catch {}
    })();
  }, []);

  async function saveAssistantSettings() {
    setSavingSet(true);
    try {
      const res = await fetch("/api/assistant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: assCfg.model,
          temperature: assCfg.temperature,
          maxTokens: assCfg.maxTokens,
          useData: assCfg.useData,
          endpoint: assCfg.endpoint,
          key: assKeyInput,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Lỗi lưu cài đặt");
      setAssCfg(d.settings);
      setAssKeyInput("");
      setSetOpen(false);
      toast.success("Đã lưu cài đặt Trợ lý AI", "Áp dụng cho các câu trả lời tiếp theo.");
    } catch (e: any) {
      toast.error("Lưu cài đặt thất bại", e?.message || String(e));
    } finally {
      setSavingSet(false);
    }
  }

  async function loadConversations(): Promise<Conv[]> {
    try {
      const d = await fetch("/api/assistant/history?list=1").then((r) => r.json());
      const list: Conv[] = d.ok ? d.conversations : [];
      const shared: Conv[] = d.ok ? d.shared || [] : [];
      setConversations(list);
      setSharedConvs(shared);
      return list;
    } catch {
      return [];
    }
  }

  async function openConversation(id: number) {
    try {
      const d = await fetch("/api/assistant/history?sessionId=" + id).then((r) => r.json());
      if (d.ok) {
        setSessionId(id);
        setViewing({
          mine: !!d.canManage,
          shared: !!d.conversation?.shared,
          ownerName: d.conversation?.userName || "Người dùng",
        });
        setMessages((d.messages as any[]).map((m) => {
          let atts: Attach[] | undefined;
          try { atts = m.attachments ? JSON.parse(m.attachments) : undefined; } catch {}
          return {
            role: m.role === "user" ? ("user" as const) : ("ai" as const),
            text: m.content,
            time: m.createdAt,
            userName: m.userName || "",
            attachments: atts,
          };
        }));
        setShowSidebar(false);
      }
    } catch {}
  }

  /** Bật/tắt chia sẻ đoạn chat của tôi cho cả team xem */
  async function toggleShare(cv: Conv) {
    try {
      const res = await fetch("/api/assistant/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cv.id, shared: !cv.shared }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không thể cập nhật chia sẻ");
      setConversations((c) => c.map((x) => (x.id === cv.id ? { ...x, shared: !cv.shared } : x)));
      setSharedConvs((c) => (cv.shared ? c : [...c, { ...cv, shared: true }]));
      setViewing((v) => (v && sessionId === cv.id ? { ...v, shared: !cv.shared } : v));
      toast.success(!cv.shared ? "Đã chia sẻ đoạn chat cho cả team" : "Đã ngừng chia sẻ đoạn chat");
    } catch (err: any) {
      toast.error("Cập nhật chia sẻ thất bại", err.message || String(err));
    }
  }

  function newChat() {
    setSessionId(null);
    setViewing(null);
    setMessages([]);
    setShowSidebar(false);
    inputRef.current?.focus();
  }

  async function deleteConversation(id: number) {
    const cf = await Swal.fire({
      title: "Xoá đoạn chat này?",
      text: "Đoạn chat sẽ bị xoá vĩnh viễn khỏi lịch sử của bạn. Hành động này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      await fetch("/api/assistant/history?sessionId=" + id, { method: "DELETE" });
      setConversations((c) => c.filter((x) => x.id !== id));
      if (sessionId === id) newChat();
      toast.success("Đã xoá đoạn chat");
    } catch {}
  }

  async function deleteAll() {
    const cf = await Swal.fire({
      title: "Xoá Toàn bộ lịch sử chat?",
      text: `Toàn bộ ${conversations.length} đoạn chat của bạn sẽ bị xoá vĩnh viễn. Hành động này KHÔNG THỂ hoàn tác!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá tất cả",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      await fetch("/api/assistant/history", { method: "DELETE" });
      setConversations([]);
      setSessionId(null);
      setViewing(null);
      setMessages([]);
      toast.success("Đã xoá toàn bộ lịch sử");
    } catch {}
  }

  useEffect(() => {
    (async () => {
      const list = await loadConversations();
      if (list.length > 0) await openConversation(list[0].id);
      setLoadingHistory(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function setLast(text: string) {
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { ...copy[copy.length - 1], text };
      return copy;
    });
  }

  function cleanStream(raw: string): string {
    let s = raw || "";
    // Bỏ khối suy nghĩ ĐÃ ĐÓNG thẻ (giữ phần trả lời phía sau)
    s = s.replace(/([\s\S]*?<\/think>)/gi, "");
    // Model đang suy nghĩ, chưa có câu trả lời (thẻ <think> chưa đóng)
    if (/<think[\s>]/i.test(s)) s = "";
    s = s.replace(/<\/?thinking>|<\/?thought>|<\/?reasoning>/gi, "");
    return s;
  }

  async function handleAttachUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (attaching.length >= 5) {
      toast.error("Tối đa 5 đính kèm mỗi tin nhắn");
      return;
    }
    setUploadingAtt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/assistant/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Upload thất bại");
      setAttaching((a) => [...a, { url: d.url, name: d.name, type: d.type, size: d.size }]);
    } catch (err: any) {
      toast.error("Không đính kèm được file", err.message || String(err));
    } finally {
      setUploadingAtt(false);
      inputRef.current?.focus();
    }
  }

  function insertEmoji(em: string) {
    setInput((v) => (v + em));
    setEmojiOpen(false);
    inputRef.current?.focus();
  }

  async function ask(question: string, atts: Attach[] = []) {
    if ((!question.trim() && atts.length === 0) || loading) return;
    setInput("");
    setAttaching([]);
    setEmojiOpen(false);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((m) => [
      ...m,
      { role: "user", text: question, time: new Date().toISOString(), attachments: atts.length ? atts : undefined },
      { role: "ai", text: "" },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId, attachments: atts }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Lỗi HTTP " + res.status);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      let buffer = "";
      let hadError = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const j = JSON.parse(t);
            if (j.error) {
              hadError = true;
              toast.error("Trợ lý AI lỗi", j.error);
              setLast("⚠️ " + j.error);
            } else if (j.delta) {
              raw += j.delta;
              setLast(cleanStream(raw));
            } else if (j.done) {
              if (j.sessionId) setSessionId(j.sessionId);
              setLast(cleanStream(raw).trim() || "⚠️ Model phản hồi trống hoặc quá chậm. Hãy thử lại, hoặc đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa.");
            }
          } catch {}
        }
      }
      if (!hadError) setLast(cleanStream(raw).trim() || "⚠️ Model phản hồi trống hoặc quá chậm. Hãy thử lại, hoặc đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa.");
      loadConversations();
    } catch (err: any) {
      setLast("⚠️ " + (err.message || "Lỗi kết nối"));
      toast.error("Trợ lý AI lỗi", err.message || String(err));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function copyMsg(i: number) {
    try {
      await navigator.clipboard.writeText(messages[i].text);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  }

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const sidebarHeader = (
    <div className="p-3.5 border-b border-[var(--border-soft)] shrink-0">
      <div className="flex items-center gap-2.5 mb-3">
        {/* Logo công ty — lấy từ Cài đặt hệ thống (BrandProvider) */}
        <div className="h-10 w-10 rounded-xl overflow-hidden shadow bg-white grid place-items-center shrink-0 ring-1 ring-[var(--border-soft)]">
          {logoUrl && !brandLogoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName || "Logo công ty"} className="h-full w-full object-cover" onError={() => setBrandLogoFailed(true)} />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1b98e0] to-violet-500 grid place-items-center">
              <Building2 size={20} className="text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[13px] leading-tight truncate">{companyName || "Tân Phú Land"}</div>
          <div className="text-[10px] text-slate-400 truncate">Trợ lý AI Marketing</div>
        </div>
      </div>
      <button onClick={newChat} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1b98e0] text-white font-bold text-[13px] py-2.5 hover:bg-[#1376b0] transition shadow-md shadow-[#1b98e0]/25" type="button">
        <Plus size={16} /> Cuộc trò chuyện mới
      </button>
    </div>
  );

  const convList = (onPick?: () => void) => (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab: của tôi / được chia sẻ */}
      <div className="grid grid-cols-2 gap-1.5 p-2.5 border-b border-[var(--border-soft)] shrink-0">
        <button onClick={() => setTab("mine")} type="button"
          className={`flex items-center justify-center gap-1.5 text-[11px] font-bold px-1.5 py-2 rounded-lg transition min-w-0 overflow-hidden ${tab === "mine" ? "bg-[#1b98e0] text-white shadow" : "bg-[var(--panel2)] text-slate-400 hover:text-slate-200"}`}
          title="Đoạn chat của bạn">
          <MessageCircle size={12} className="shrink-0" />
          <span className="truncate">Của tôi{conversations.length > 0 ? ` (${conversations.length})` : ""}</span>
        </button>
        <button onClick={() => setTab("shared")} type="button"
          className={`flex items-center justify-center gap-1.5 text-[11px] font-bold px-1.5 py-2 rounded-lg transition min-w-0 overflow-hidden ${tab === "shared" ? "bg-[#1b98e0] text-white shadow" : "bg-[var(--panel2)] text-slate-400 hover:text-slate-200"}`}
          title="Đoạn chat được người khác chia sẻ">
          <Users size={12} className="shrink-0" />
          <span className="truncate">Chia sẻ{sharedConvs.length > 0 ? ` (${sharedConvs.length})` : ""}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1 min-h-0">
        {tab === "mine" ? (
          <>
            {filteredConversations.map((cv) => (
              <div key={cv.id} className={`group flex items-center gap-1 rounded-xl transition ${sessionId === cv.id ? "bg-[#1b98e0]/15" : "hover:bg-[var(--panel2)]"}`}>
                <button onClick={() => { openConversation(cv.id); onPick?.(); }} className="flex-1 min-w-0 text-left px-2.5 py-2.5" type="button">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle size={12} className={`shrink-0 ${sessionId === cv.id ? "text-[#1b98e0]" : "text-slate-500"}`} />
                    <span className={`truncate text-xs font-medium ${sessionId === cv.id ? "text-[#1b98e0]" : ""}`} title={cv.title}>{cv.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 pl-[18px]">
                    <span>{fmtRel(cv.updatedAt)}</span>
                    {cv.shared && (
                      <span title="Đang chia sẻ" className="px-1.5 py-[1px] rounded-full text-[8px] font-bold leading-none text-white bg-emerald-500 shrink-0">
                        Chia sẻ
                      </span>
                    )}
                  </div>
                </button>
                <button onClick={() => toggleShare(cv)} className={`p-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition ${cv.shared ? "text-emerald-400" : "text-slate-500 hover:text-[#1b98e0]"}`} title={cv.shared ? "Ngừng chia sẻ" : "Chia sẻ cho cả team xem"} type="button">
                  <Share2 size={12} />
                </button>
                <button onClick={() => deleteConversation(cv.id)} className="p-1.5 mr-1.5 shrink-0 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition" title="Xoá" type="button">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {filteredConversations.length === 0 && conversations.length > 0 && (
              <div className="text-center px-3 py-8">
                <Search size={26} className="mx-auto text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-500">Không tìm thấy đoạn chat phù hợp.</p>
              </div>
            )}
            {conversations.length === 0 && (
              <div className="text-center px-3 py-8">
                <MessageCircle size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-500">Chưa có đoạn chat nào.<br />Hỏi câu đầu tiên nhé!</p>
              </div>
            )}
          </>
        ) : (
          <>
            {sharedConvs.map((cv) => (
              <div key={cv.id} className={`flex items-center gap-1 rounded-xl transition ${sessionId === cv.id ? "bg-[#1b98e0]/15" : "hover:bg-[var(--panel2)]"}`}>
                <button onClick={() => { openConversation(cv.id); onPick?.(); }} className="flex-1 min-w-0 text-left px-2.5 py-2.5" type="button">
                  <div className={`text-xs font-medium truncate ${sessionId === cv.id ? "text-[#1b98e0]" : ""}`}>{cv.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">👤 {cv.userName || "Người dùng"} · {fmtRel(cv.updatedAt)}</div>
                </button>
              </div>
            ))}
            {sharedConvs.length === 0 && (
              <div className="text-center px-3 py-8">
                <Users size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-[11px] text-slate-500">Chưa có đoạn chat nào được chia sẻ.<br />Người khác bấm nút 🔗 chia sẻ là sẽ thấy ở đây.</p>
              </div>
            )}
          </>
        )}
      </div>

      {tab === "mine" && conversations.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--border-soft)] shrink-0">
          <button onClick={deleteAll} className="text-[10px] text-slate-500 hover:text-rose-400 transition truncate" type="button">
            🗑 Xoá tất cả lịch sử của tôi
          </button>
        </div>
      )}

      {/* Minh hoạ + tagline thương hiệu, cố định ở đáy sidebar */}
      <div className="shrink-0 border-t border-[var(--border-soft)] bg-gradient-to-b from-transparent to-[#1b98e0]/5">
        <CityIllustration className="w-full h-24" />
        <div className="px-3.5 pb-3 -mt-1">
          <div className="font-extrabold text-[13px] leading-tight text-[#1376b0]">
            Bất động sản<br />{companyName || "Tân Phú Land"}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
            Đồng hành cùng bạn trên hành trình an cư – đầu tư.
          </p>
        </div>
        {canEditAss && (
          <button
            onClick={() => setSetOpen(true)}
            className="w-full flex items-center gap-1.5 px-3.5 py-2.5 border-t border-[var(--border-soft)] text-[11px] font-semibold text-slate-400 hover:text-[#1b98e0] transition"
            title="Cấu hình AI dành riêng cho Trợ lý (model, key, độ sáng tạo...)"
            type="button"
          >
            <Sparkles size={13} /> Cài đặt AI
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-190px)]">
      {/* Sidebar đoạn chat — desktop */}
      <div className="hidden lg:flex flex-col w-72 card overflow-hidden shrink-0">
        {sidebarHeader}
        {convList()}
      </div>

      {/* Chat chính */}
      <div className="flex flex-col flex-1 card overflow-hidden relative">
        <div className="px-3.5 py-2.5 border-b border-[var(--border-soft)] flex items-center gap-2.5 bg-gradient-to-r from-[#1b98e0]/10 to-violet-500/5 relative z-10">
          <button className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-[var(--panel2)] transition" onClick={() => setShowSidebar(true)} title="Đoạn chat" type="button">
            <Menu size={16} />
          </button>
          <BotAvatar size={32} iconSize={16} />
          <div className="min-w-0">
            <div className="font-extrabold text-[13px]">{assistantName}</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              {loading ? "Đang soạn câu trả lời..." : "Trực tuyến · đọc số liệu thật của bạn"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {sessionId && viewing && !viewing.mine && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 flex items-center gap-1" title={`Đang xem đoạn chat được chia sẻ của ${viewing.ownerName}`}>
                <Eye size={11} /> Chỉ xem · {viewing.ownerName}
              </span>
            )}

            <button
              onClick={() => setSearchOpen((s) => !s)}
              className={`hidden sm:inline-flex p-2 rounded-lg transition ${searchOpen ? "bg-[#1b98e0]/15 text-[#1b98e0]" : "text-slate-400 hover:bg-[var(--panel2)] hover:text-white"}`}
              title="Tìm đoạn chat"
              type="button"
            >
              <Search size={15} />
            </button>

            {sessionId && viewing?.mine && (
              <button
                onClick={() => { const cv = conversations.find((x) => x.id === sessionId); if (cv) toggleShare(cv); }}
                className={`p-2 rounded-lg transition ${viewing.shared ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 hover:bg-[var(--panel2)] hover:text-white"}`}
                title={viewing.shared ? "Ngừng chia sẻ đoạn chat này" : "Chia sẻ đoạn chat này cho cả team xem"}
                type="button"
              >
                <Share2 size={15} />
              </button>
            )}
            {sessionId && viewing?.mine && (
              <button onClick={() => deleteConversation(sessionId)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition" title="Xoá đoạn chat hiện tại" type="button">
                <Trash2 size={15} />
              </button>
            )}

            <div className="relative">
              <button onClick={() => setMenuOpen((s) => !s)} className="p-2 rounded-lg text-slate-400 hover:bg-[var(--panel2)] hover:text-white transition" title="Thêm" type="button">
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-[var(--border-soft)] bg-[var(--panel)] shadow-xl py-1.5 overflow-hidden">
                    <button onClick={() => { newChat(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--panel2)] transition" type="button">
                      <Plus size={13} /> Cuộc trò chuyện mới
                    </button>
                    {conversations.length > 0 && (
                      <button onClick={() => { deleteAll(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-rose-400 hover:bg-rose-500/10 transition" type="button">
                        <Trash2 size={13} /> Xoá toàn bộ lịch sử
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="px-3.5 py-2 border-b border-[var(--border-soft)] flex items-center gap-2 bg-[var(--panel2)]/40 relative z-10">
            <Search size={13} className="text-slate-500 shrink-0" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề đoạn chat..."
              className="flex-1 bg-transparent outline-none text-xs text-slate-200 placeholder:text-slate-500"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1 text-slate-500 hover:text-slate-300" type="button">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Minh hoạ trang trí góc trên bên phải khu vực chat */}
        <div className="pointer-events-none absolute right-0 top-14 w-40 h-28 opacity-[0.06] z-0">
          <CityIllustration className="w-full h-full" />
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 relative z-[1]">
          {!loadingHistory && messages.length === 0 && (
            <div className="flex items-start gap-2">
              <BotAvatar size={32} iconSize={16} />
              <div className="max-w-[85%]">
                <div className="px-3.5 py-2.5 text-[13px] leading-[1.6] bg-[var(--panel2)] text-slate-200 rounded-xl rounded-tl-sm border border-[var(--border-soft)]">
                  <p className="font-bold mb-1">Chào bạn! 👋</p>
                  <p>Tôi là {assistantName}.</p>
                  <p className="mt-1">Tôi có thể giúp bạn phân tích dữ liệu marketing, gợi ý nội dung cho các kênh xã hội hoặc tư vấn về các trend bất động sản mới nhất. Bạn cần hỗ trợ gì hôm nay?</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {SUGGESTIONS.map(({ text, icon: Icon }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => ask(text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--panel2)] hover:bg-[#1b98e0]/10 border border-[var(--border-soft)] hover:border-[#1b98e0]/40 transition text-[11px] font-medium text-slate-200"
                    >
                      <Icon size={12} className="text-[#1b98e0]" /> {text}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => ask("Bạn có thể gợi ý thêm những điều tôi nên hỏi không?")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--panel2)] hover:bg-[#1b98e0]/10 border border-[var(--border-soft)] hover:border-[#1b98e0]/40 transition text-[11px] font-medium text-slate-400"
                  >
                    <MoreVertical size={12} /> Khác
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const gap = m.time && prev?.time ? new Date(m.time).getTime() - new Date(prev.time).getTime() : Infinity;
            const showDivider = !prev || gap > 30 * 60000;
            return (
              <div key={i}>
                {showDivider && m.time && (
                  <div className="flex justify-center mb-3">
                    <span className="text-[10px] text-slate-500 px-3 py-1 rounded-full bg-[var(--panel2)] border border-[var(--border-soft)]">
                      👤 {m.userName || "Bạn"} · {fmtDivider(m.time)}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "ai" && (
                    <BotAvatar size={24} iconSize={12} />
                  )}
                  <div className="max-w-[85%] group">
                    <div className={`px-3.5 py-2.5 text-[13px] leading-[1.6] ${m.role === "user" ? "bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8] text-white rounded-xl rounded-br-sm shadow-md" : "bg-[var(--panel2)] text-slate-200 rounded-xl rounded-tl-sm border border-[var(--border-soft)]"}`}>
                      {m.role === "ai" ? (m.text ? (
                        <>
                          <RichText text={m.text} />
                          {loading && i === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-3.5 bg-[#1b98e0] animate-pulse ml-0.5 align-middle rounded-sm" />
                          )}
                        </>
                      ) : (
                        <TypingDots />
                      )) : m.text}
                    </div>
                    {/* Đính kèm: hình ảnh + file */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className={`mt-1.5 space-y-1.5 ${m.role === "user" ? "flex flex-wrap gap-1.5 space-y-0" : ""}`}>
                        {m.attachments.filter((a) => a.type === "image").map((a, k) => (
                          <a key={"img" + k} href={a.url} target="_blank" rel="noreferrer" className="block">
                            <img src={a.url} alt={a.name} className="max-h-48 rounded-xl border border-[var(--border-soft)] shadow-sm hover:opacity-90 transition" />
                          </a>
                        ))}
                        {m.attachments.filter((a) => a.type === "file").map((a, k) => (
                          <a key={"file" + k} href={a.url} target="_blank" rel="noreferrer" download className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--panel2)] border border-[var(--border-soft)] hover:border-[#1b98e0]/40 transition max-w-[240px]">
                            <Paperclip size={12} className="shrink-0 text-[#1b98e0]" />
                            <span className="text-[11px] truncate">{a.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-2 mt-0.5 ${m.role === "user" ? "justify-end" : ""}`}>
                      <span className="text-[9px] text-slate-500">{fmtTime(m.time)}</span>
                      {m.role === "ai" && m.text && !loading && (
                        <button onClick={() => copyMsg(i)} className="text-[10px] text-slate-500 hover:text-[#1b98e0] flex items-center gap-1 transition" type="button">
                          {copiedIdx === i ? <Check size={10} className="text-emerald-400" /> : null}
                          {copiedIdx === i ? "Đã sao chép" : "Sao chép"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-[var(--border-soft)] p-2.5 relative z-[1]">
          {viewing && sessionId && !viewing.mine ? (
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 py-1.5">
              <Eye size={13} className="text-sky-400" />
              Đang xem đoạn chat được chia sẻ của <b className="text-slate-200">{viewing.ownerName}</b> — bấm
              <button onClick={newChat} className="text-[#1b98e0] font-bold hover:underline" type="button">Đoạn chat mới</button>
              để hỏi AI.
            </div>
          ) : (
          <>
          <div className="flex items-end gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--panel2)]/60 px-2 py-1.5">
            <div className="flex items-center gap-0.5 pb-1.5 shrink-0">
              <button type="button" title="Đính kèm file" disabled={loading || uploadingAtt} onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-slate-400 hover:text-[#1b98e0] hover:bg-[var(--panel)] transition disabled:opacity-40">
                {uploadingAtt ? <Spinner size={15} /> : <Paperclip size={15} />}
              </button>
              <button type="button" title="Đính kèm hình ảnh" disabled={loading || uploadingAtt} onClick={() => imageInputRef.current?.click()} className="p-1.5 rounded-lg text-slate-400 hover:text-[#1b98e0] hover:bg-[var(--panel)] transition disabled:opacity-40">
                <ImageIcon size={15} />
              </button>
              <div className="relative">
                <button type="button" title="Chèn biểu tượng" disabled={loading} onClick={() => setEmojiOpen((o) => !o)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#1b98e0] hover:bg-[var(--panel)] transition disabled:opacity-40">
                  <Smile size={15} />
                </button>
                {emojiOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setEmojiOpen(false)} />
                    <div className="absolute bottom-10 left-0 z-50 card p-2 grid grid-cols-6 gap-1 w-[228px]">
                      {["😊","😂","👍","🙏","🔥","❤️","🎉","🚀","✅","❌","💡","📈","🏠","🏢","💰","📞","📅","⭐","😅","🤔","😉","🙌","💯","⚡"].map((em) => (
                        <button key={em} type="button" onClick={() => insertEmoji(em)} className="text-lg p-1 rounded-lg hover:bg-[var(--panel2)] transition">{em}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={handleAttachUpload} />
            <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={handleAttachUpload} />
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 resize-none max-h-28 py-1.5 text-[13px] bg-transparent outline-none placeholder:text-slate-500"
              placeholder="Hỏi về số liệu marketing của bạn..."
              value={input}
              disabled={loading}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
              }}
              onKeyDown={(e) => {
                // Enter = gửi · Shift+Enter = xuống dòng (để textarea tự chèn ký tự mới)
                if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
                  e.preventDefault();
                  ask(input, attaching);
                }
              }}
              onPaste={(e) => {
                // Dán ảnh từ clipboard → tự đính kèm
                const f = Array.from(e.clipboardData?.files || [])[0];
                if (f && f.type.startsWith("image/")) {
                  e.preventDefault();
                  const dt = new DataTransfer();
                  dt.items.add(f);
                  const ev = { target: { files: dt.files, value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleAttachUpload(ev);
                }
              }}
            />
            <button
              onClick={() => ask(input, attaching)}
              disabled={loading || uploadingAtt || (!input.trim() && attaching.length === 0)}
              className="shrink-0 h-9 w-9 grid place-items-center rounded-lg bg-[#1b98e0] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1376b0] transition"
              title="Gửi"
              type="button"
            >
              {loading ? <Spinner size={14} /> : <Send size={15} />}
            </button>
          </div>
          {/* Chip đính kèm đang chờ gửi */}
          {attaching.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {attaching.map((a, idx) => (
                <span key={a.url + idx} className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-[var(--panel2)] border border-[var(--border-soft)] text-[10px] text-slate-300 max-w-[220px]">
                  {a.type === "image"
                    ? <img src={a.url} alt={a.name} className="h-6 w-6 rounded object-cover shrink-0" />
                    : <Paperclip size={11} className="shrink-0 text-[#1b98e0]" />}
                  <span className="truncate">{a.name}</span>
                  <button onClick={() => setAttaching((arr) => arr.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-rose-400 shrink-0" title="Bỏ đính kèm" type="button">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="text-[9px] text-slate-500 mt-1 text-center">
            Enter để gửi · Shift + Enter để xuống dòng · AI trả lời dựa trên số liệu thật, mỗi câu tốn một ít token
          </div>
          </>
          )}
        </div>
      </div>

      {/* Modal cài đặt Trợ lý AI — chỉ Admin */}
      <Modal open={setOpen} onClose={() => setSetOpen(false)} title="Cài đặt Trợ lý AI">
        <div className="space-y-4">
          <div>
            <p className="field-label">Model AI dành riêng cho Trợ lý</p>
            <input
              className="input w-full"
              value={assCfg.model}
              onChange={(e) => setAssCfg((c) => ({ ...c, model: e.target.value }))}
              placeholder=""
            />
            <p className="text-[10px] text-slate-400 mt-1">Ví dụ: openai/gpt-oss-120b, llama-3.3-70b-versatile, nvidia/nemotron-3.5-lightning:free</p>
          </div>

          <div>
            <p className="field-label">API Key riêng cho Trợ lý</p>
            <div className="flex gap-2">
              <input
                type="password"
                className="input w-full"
                value={assKeyInput}
                onChange={(e) => setAssKeyInput(e.target.value)}
                placeholder={assCfg.hasKey ? `Đã có key riêng (${assCfg.keyMasked}) — để trống giữ nguyên` : ""}
                autoComplete="new-password"
              />
              {assCfg.hasKey && (
                <button
                  onClick={() => setAssKeyInput("-")}
                  className="px-2.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold text-rose-400 hover:border-rose-400/50 hover:bg-rose-500/10 transition shrink-0"
                  title="Xoá key riêng — Trợ lý dùng lại key hệ thống"
                  type="button"
                >
                  Bỏ
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {assKeyInput === "-"
                ? "Sẽ XOÁ key riêng khi bấm Lưu — Trợ lý dùng lại key hệ thống."
                : "Cho phép Trợ lý dùng nhà cung cấp khác hệ thống (VD: hệ thống dùng Groq, Trợ lý dùng OpenRouter với key riêng)."}
            </p>
          </div>

          <div>
            <p className="field-label">Endpoint API riêng (tuỳ chọn)</p>
            <input
              className="input w-full"
              value={assCfg.endpoint}
              onChange={(e) => setAssCfg((c) => ({ ...c, endpoint: e.target.value }))}
              placeholder=""
            />
          </div>

          <div>
            <p className="field-label">Mức sáng tạo (temperature): {assCfg.temperature.toFixed(1)}</p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={assCfg.temperature}
              onChange={(e) => setAssCfg((c) => ({ ...c, temperature: Number(e.target.value) }))}
              className="w-full accent-[#1b98e0]"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.0 — Chính xác, bám số liệu</span>
              <span>1.0 — Sáng tạo, tự nhiên</span>
            </div>
          </div>

          <div>
            <p className="field-label">Độ dài câu trả lời tối đa (tokens)</p>
            <input
              type="number"
              min={200}
              max={8000}
              step={100}
              className="input w-full"
              value={assCfg.maxTokens}
              onChange={(e) => setAssCfg((c) => ({ ...c, maxTokens: Number(e.target.value) || 2000 }))}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={assCfg.useData}
              onChange={(e) => setAssCfg((c) => ({ ...c, useData: e.target.checked }))}
              className="accent-[#1b98e0] h-4 w-4"
            />
            <span className="text-[12px]">
              Trợ lý đọc <b>số liệu hệ thống</b> (leads, nội dung, chiến dịch, trend...) khi trả lời
            </span>
          </label>
          <p className="text-[10px] text-slate-400 -mt-2 ml-7">
            Tắt nếu chỉ muốn trò chuyện thông thường — câu trả lời sẽ nhanh hơn và không tốn token đọc dữ liệu.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
            <button onClick={() => setSetOpen(false)} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-white transition" type="button">
              Huỷ
            </button>
            <button
              onClick={saveAssistantSettings}
              disabled={savingSet}
              className="px-4 py-2 rounded-lg bg-[#1b98e0] text-white text-[12px] font-bold hover:bg-[#1376b0] transition disabled:opacity-50 flex items-center gap-1.5"
              type="button"
            >
              {savingSet ? <Spinner size={13} /> : <Check size={13} />} Lưu cài đặt
            </button>
          </div>
        </div>
      </Modal>

      {/* Sidebar mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-soft)] shrink-0">
              <span className="font-extrabold text-sm">Đoạn chat</span>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-[var(--panel2)]" type="button">
                <X size={16} />
              </button>
            </div>
            <button onClick={() => { newChat(); setShowSidebar(false); }} className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#1b98e0] text-white font-bold text-[13px] py-2.5 hover:bg-[#1376b0] transition shrink-0" type="button">
              <Plus size={16} /> Cuộc trò chuyện mới
            </button>
            <div className="flex-1 min-h-0 mt-2">{convList(() => setShowSidebar(false))}</div>
          </div>
        </div>
      )}
    </div>
  );
}