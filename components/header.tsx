"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import usePerm from "./usePerm";
import { Spinner } from "./ui";
import {
  Search,
  Bell,
  HelpCircle,
  Plus,
  Users,
  User,
  Files,
  X,
  CheckCircle2,
  MessageCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Link2,
  FileText,
  Upload,
  ExternalLink,
  Download,
} from "./icons";

type SearchResults = {
  leads: { id: number; name: string; phone: string }[];
  contents: { id: number; title: string }[];
};

type NotifTab = "all" | "general" | "private";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

const NOTIF_PAGE_SIZE = 10;
const TITLE_MAX = 200;
const BODY_MAX = 1000;

export default function Header({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; name?: string; email?: string; role?: string; permissions?: string }
    | undefined;
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [jobTitleHdr, setJobTitleHdr] = useState("");

  useEffect(() => {
    let active = true;
    const loadAvatar = () => {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => { if (active && d.ok) { setAvatarUrl(d.user?.avatar || ""); setJobTitleHdr(d.user?.jobTitle || ""); } })
        .catch(() => {});
    };
    loadAvatar();
    window.addEventListener("profile:refresh", loadAvatar);
    return () => { active = false; window.removeEventListener("profile:refresh", loadAvatar); };
  }, []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [notifs, setNotifs] = useState<{ id: number; title: string; body?: string | null; read: boolean; createdAt: string; type: string; refId?: number | null; isGeneral?: boolean; userId?: number | null; link?: string | null; fileName?: string | null; filePath?: string | null }[]>([]);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [visibleCount, setVisibleCount] = useState(NOTIF_PAGE_SIZE);
  const [notifTab, setNotifTab] = useState<NotifTab>("all");
  const currentUserId = user?.id ? Number(user.id) : undefined;
  const isAdmin = !!user && (user.role === "Admin" || (() => { try { return (JSON.parse(user.permissions || "[]") || []).includes("*"); } catch { return false; } })());
  const canCreateContent = usePerm("content_studio_create");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newFile, setNewFile] = useState<{ fileName: string; filePath: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scope, setScope] = useState<"general" | "private">("general");

  const gKey = (id: number) => `notif-g-read-${currentUserId}-${id}`;
  function effectiveRead(n: { id: number; read: boolean; isGeneral?: boolean }) {
    if (n.isGeneral) return localStorage.getItem(gKey(n.id)) === "1";
    return n.read;
  }
  function computeUnread(list: { id: number; read: boolean; isGeneral?: boolean }[]) {
    return list.reduce((acc, n) => (effectiveRead(n) ? acc : acc + 1), 0);
  }
  async function loadNotifs() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.ok) {
        setNotifs(data.notifications || []);
        setUnread(computeUnread(data.notifications || []));
      }
    } catch {}
  }
  async function markRead(n: { id: number; read: boolean; isGeneral?: boolean }) {
    if (n.isGeneral) { localStorage.setItem(gKey(n.id), "1"); }
    else { try { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); } catch {} }
    loadNotifs();
  }
  async function markAll() {
    notifs.filter((n) => n.isGeneral).forEach((n) => localStorage.setItem(gKey(n.id), "1"));
    try { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); } catch {}
    loadNotifs();
  }

  // Số tin nhắn chat chưa đọc (cá nhân + nhóm) để hiện badge trên icon chat — poll 5 giây
  useEffect(() => {
    let active = true;
    async function loadChatUnread() {
      try {
        const res = await fetch("/api/messages/unread-count");
        const d = await res.json();
        if (active && d.ok) setChatUnread(d.unread || 0);
      } catch {}
    }
    loadChatUnread();
    const t = setInterval(loadChatUnread, 5000);
    window.addEventListener("focus", loadChatUnread);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener("focus", loadChatUnread);
    };
  }, []);

  /** Trả về đường link điều hướng khi click vào thông báo (nếu có đối tượng liên quan) */
  function notifHref(n: { type: string; refId?: number | null }): string | null {
    if (n.type === "task") return n.refId ? `/dashboard/team?task=${n.refId}` : "/dashboard/team";
    if (n.type === "lead") return n.refId ? `/dashboard/leads?focus=${n.refId}` : "/dashboard/leads";
    if (n.type === "report") return n.refId ? `/dashboard/work-reports?focus=${n.refId}` : "/dashboard/work-reports";
    return null;
  }
  function goNotif(n: { type: string; refId?: number | null }) {
    const href = notifHref(n);
    if (!href) return;
    setNotifOpen(false);
    router.push(href);
  }
  async function sendAnnounce() {
    if (!newTitle.trim()) return;
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newBody,
          link: newLink,
          fileName: newFile?.fileName || null,
          filePath: newFile?.filePath || null,
        }),
      });
      setNewTitle(""); setNewBody(""); setNewLink(""); setNewFile(null); setShowNew(false); setScope("general");
      loadNotifs();
    } catch {}
  }
  async function uploadFile(file: File) {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/notifications/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.ok) setNewFile({ fileName: d.fileName, filePath: d.filePath });
      else alert(d.error || "Tải file lên thất bại");
    } catch {
      alert("Tải file lên thất bại");
    } finally {
      setUploadingFile(false);
    }
  }
  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file);
  }
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || uploadingFile) return;
    const ok = /\.(docx?|pdf)$/i.test(file.name);
    if (!ok) { alert("Chỉ hỗ trợ file .doc, .docx hoặc .pdf"); return; }
    uploadFile(file);
  }

  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (currentUserId) loadNotifs(); }, [currentUserId]);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.ok) setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const noResults =
    !!results && results.leads.length === 0 && results.contents.length === 0;

  const generalCount = notifs.filter((n) => n.isGeneral).length;
  const privateCount = notifs.length - generalCount;
  const filteredNotifs =
    notifTab === "general" ? notifs.filter((n) => n.isGeneral) :
    notifTab === "private" ? notifs.filter((n) => !n.isGeneral) :
    notifs;

  function selectTab(t: NotifTab) {
    setNotifTab(t);
    setVisibleCount(NOTIF_PAGE_SIZE);
  }

  return (
    <header className="h-[76px] flex items-center justify-between px-7 border-b border-[var(--border)] bg-[var(--panel)] sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenu} className="btn-icon lg:hidden shrink-0" type="button" aria-label="Mở menu">
          <Menu size={20} />
        </button>
        <div className="min-w-0 hidden md:block">
          <h1 className="text-xl font-extrabold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div ref={boxRef} className="relative hidden md:block">
          <div
            className={`flex items-center gap-2 border rounded-lg bg-[var(--panel2)] px-3 py-2 w-64 transition-all ${
              searchOpen ? "border-[#1b98e0] shadow-[0_0_0_3px_rgba(139,92,246,0.12)]" : "border-[var(--border)]"
            }`}
          >
            <Search size={16} className="text-slate-500 shrink-0" />
            <input
              className="bg-transparent outline-none text-xs w-full"
              placeholder="Tìm lead, content..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            {loading && <Spinner size={12} />}
            {!loading && q && (
              <button onClick={() => { setQ(""); setResults(null); }} type="button" aria-label="Xoá tìm kiếm">
                <X size={13} className="text-slate-500 hover:text-white transition" />
              </button>
            )}
          </div>
          {searchOpen && q.trim() && (
            <div className="absolute right-0 mt-2 w-80 glass rounded-xl p-2 shadow-2xl animate-in max-h-[70vh] overflow-y-auto border border-[var(--border-soft)]">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 p-3">
                  <Spinner size={13} /> Đang tìm...
                </div>
              )}
              {!loading && results && (
                <>
                  {noResults && (
                    <div className="text-xs text-slate-500 p-4 text-center">
                      Không tìm thấy kết quả cho "<span className="text-slate-300">{q}</span>"
                    </div>
                  )}
                  {results.leads.length > 0 && (
                    <SearchGroup icon={Users} label="Leads">
                      {results.leads.map((l) => (
                        <SearchItem key={l.id} onClick={() => { router.push("/dashboard/leads"); setSearchOpen(false); }}>
                          {l.name} • {l.phone}
                        </SearchItem>
                      ))}
                    </SearchGroup>
                  )}
                  {results.contents.length > 0 && (
                    <SearchGroup icon={Files} label="Content">
                      {results.contents.map((c) => (
                        <SearchItem key={c.id} onClick={() => { router.push("/dashboard/content"); setSearchOpen(false); }}>
                          {c.title}
                        </SearchItem>
                      ))}
                    </SearchGroup>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* CHAT */}
        <Link href="/dashboard/chat" className="btn-icon relative" type="button" aria-label="Nhắn tin" title="Nhắn tin">
          <MessageCircle size={18} />
          {chatUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </Link>

        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              setVisibleCount(NOTIF_PAGE_SIZE);
              setNotifTab("all");
              loadNotifs();
              if (next) markAll(); // mở dropdown = coi như đã đọc hết
            }}
            className="btn-icon relative"
            type="button"
            aria-label="Thông báo"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center">
                <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                <span className="relative">{unread > 9 ? "9+" : unread}</span>
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="fixed left-4 right-4 top-[80px] max-h-[calc(100vh-100px)] overflow-hidden flex flex-col glass rounded-2xl shadow-2xl animate-in z-30 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[75vh] border border-[var(--border-soft)]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-soft)] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#1b98e0]/10 grid place-items-center">
                    <Bell size={17} className="text-[#1b98e0]" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold leading-tight">Thông báo</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {notifs.length} tổng • {unread} chưa đọc
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/15 transition"
                    type="button"
                  >
                    <Plus size={13} /> Gửi thông báo
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-[var(--border-soft)] shrink-0">
                {(
                  [
                    { key: "all" as NotifTab, label: "Tất cả", count: notifs.length },
                    { key: "general" as NotifTab, label: "Chung", count: generalCount },
                    { key: "private" as NotifTab, label: "Riêng tư", count: privateCount },
                  ]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => selectTab(t.key)}
                    type="button"
                    className={`relative px-3 py-2 text-xs font-semibold transition ${
                      notifTab === t.key ? "text-[#1b98e0]" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {t.label} ({t.count})
                    {notifTab === t.key && (
                      <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[#1b98e0]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Toolbar */}
              {filteredNotifs.length > 0 && unread > 0 && (
                <div className="flex items-center justify-end px-4 py-2 shrink-0">
                  <button
                    onClick={markAll}
                    className="text-[10px] font-semibold text-[#1b98e0] hover:opacity-80 transition"
                    type="button"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                </div>
              )}

              {/* List */}
              <div className="overflow-y-auto px-3 pb-3 pt-2 flex-1">
                {notifs.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-[var(--panel2)] grid place-items-center mx-auto mb-3">
                      <Bell size={20} className="text-slate-600" />
                    </div>
                    <div className="text-xs text-slate-500">Chưa có thông báo nào</div>
                  </div>
                )}

                {notifs.length > 0 && filteredNotifs.length === 0 && (
                  <EmptyNotifState
                    title={notifTab === "all" ? "Không có thông báo mới" : "Không có thông báo nào"}
                    subtitle={
                      notifTab === "all"
                        ? "Bạn đã đọc hết tất cả thông báo!"
                        : `Chưa có mục nào trong "${notifTab === "general" ? "Chung" : "Riêng tư"}".`
                    }
                  />
                )}

                <div className="space-y-1.5">
                  {filteredNotifs.slice(0, visibleCount).map((n) => {
                    const effRead = effectiveRead(n);
                    const canMark = !effRead && (!!n.isGeneral || n.userId === currentUserId);
                    const href = notifHref(n);
                    return (
                      <div
                        key={n.id}
                        onClick={() => goNotif(n)}
                        className={`group relative flex items-start gap-3 p-3 rounded-2xl transition border ${
                          href ? "cursor-pointer" : ""
                        } ${
                          effRead
                            ? "opacity-60 hover:opacity-95 border-transparent"
                            : "bg-[var(--panel2)] hover:bg-[var(--panel2)]/80 border-[var(--border-soft)]"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 text-[11px] font-bold ${
                            n.isGeneral ? "bg-sky-500/15 text-sky-500" : "bg-[#1b98e0]/15 text-[#1b98e0]"
                          }`}
                        >
                          {n.isGeneral ? "C" : "R"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold leading-snug truncate">{n.title}</span>
                            {!effRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0] shrink-0" />
                            )}
                          </div>
                          {n.body && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
                          )}
                          {n.link && (
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-sky-500 hover:text-sky-400 transition"
                            >
                              <Link2 size={11} /> Mở link <ExternalLink size={10} />
                            </a>
                          )}
                          {n.filePath && n.fileName && (
                            <a
                              href={`/api/notifications/${n.id}/file`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-rose-500 hover:text-rose-400 transition max-w-full"
                              title="Tải file đính kèm"
                            >
                              <FileText size={11} className="shrink-0" />
                              <span className="truncate">{n.fileName}</span>
                              <Download size={10} className="shrink-0" />
                            </a>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-slate-600">{timeAgo(n.createdAt)}</span>
                            <span
                              className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 ${
                                n.isGeneral ? "bg-sky-500/10 text-sky-500" : "bg-[#1b98e0]/10 text-[#1b98e0]"
                              }`}
                            >
                              {n.isGeneral ? "Chung" : "Riêng tư"}
                            </span>
                            {href && (
                              <span className="ml-auto text-[9px] font-bold text-[#1b98e0] truncate">
                                Xem ngay →
                              </span>
                            )}
                          </div>
                        </div>
                        {canMark && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(n); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 rounded-full grid place-items-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"
                            type="button"
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredNotifs.length > visibleCount && (
                  <button
                    onClick={() => setVisibleCount((v) => v + NOTIF_PAGE_SIZE)}
                    className="w-full mt-2 py-2.5 rounded-lg text-[11px] font-semibold text-[#1b98e0] hover:bg-[var(--panel2)] transition flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    Xem thêm ({filteredNotifs.length - visibleCount} còn lại)
                    <ChevronDown size={13} />
                  </button>
                )}

                {notifs.length > 0 && (
                  <button
                    onClick={() => setVisibleCount(notifs.length)}
                    className="w-full mt-1 py-2.5 rounded-xl text-[11px] font-semibold text-[var(--text)] bg-[var(--panel2)] hover:bg-[var(--panel2)]/70 transition flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    Xem tất cả thông báo
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="btn-icon"
          type="button"
          aria-label="Đổi chủ đề"
          title="Đổi chủ đề sáng/tối"
        >
          {mounted && (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />)}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg hover:bg-[var(--panel2)] px-1.5 py-1 transition"
            type="button"
            title="Hồ sơ cá nhân"
          >
            <div className="h-9 w-9 rounded-full bg-[#1b98e0] grid place-items-center text-white shrink-0 shadow-sm overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold">{user?.name || "Chưa đăng nhập"}</div>
              <div className="text-[10px] text-slate-500">{jobTitleHdr || user?.role || "Mời đăng nhập"}</div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform shrink-0 ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="fixed left-4 right-4 top-[80px] max-h-[calc(100vh-100px)] overflow-y-auto bg-[var(--panel)] rounded-2xl shadow-2xl ring-1 ring-[var(--border)] animate-in z-40 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-h-none sm:overflow-visible">
              {/* Identity header */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="h-14 bg-gradient-to-br from-[#1b98e0] via-[#1687c9] to-[#0f5f8f]" />
                <div className="px-4 pb-4 -mt-7">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden grid place-items-center bg-gradient-to-br from-[#1b98e0] to-[#0f5f8f] text-white ring-4 ring-[var(--panel)] shadow-md">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
                    ) : (
                      <User size={22} />
                    )}
                  </div>
                  <div className="min-w-0 mt-2">
                    <div className="text-sm font-bold text-[var(--text)] truncate">{user?.name || "Chưa đăng nhập"}</div>
                    {jobTitleHdr && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1b98e0]/10 text-[#1b98e0] ring-1 ring-[#1b98e0]/20">
                        {jobTitleHdr}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className="p-2 space-y-0.5">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="group w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--panel2)] transition text-left"
                >
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-[#1b98e0]/10 text-[#1b98e0] grid place-items-center">
                    <Users size={15} />
                  </span>
                  Quản lý hồ sơ
                  <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-400 transition" />
                </Link>
                <Link
                  href="/dashboard/profile/password"
                  onClick={() => setProfileOpen(false)}
                  className="group w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--panel2)] transition text-left"
                >
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-[#1b98e0]/10 text-[#1b98e0] grid place-items-center">
                    <KeyRound size={15} />
                  </span>
                  Đổi mật khẩu
                  <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-400 transition" />
                </Link>

                <div className="h-px bg-[var(--border-soft)] my-1.5 mx-1" />

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition text-left"
                  type="button"
                >
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center">
                    <LogOut size={15} />
                  </span>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEND ANNOUNCEMENT MODAL */}
      {isAdmin && showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)} />
          <div className="relative bg-[var(--panel)] rounded-2xl w-full max-w-md shadow-2xl animate-in border border-[var(--border-soft)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#1b98e0]/10 grid place-items-center shrink-0">
                  <Bell size={18} className="text-[#1b98e0]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Gửi thông báo</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tạo thông báo mới cho nhóm</p>
                </div>
              </div>
              <button onClick={() => setShowNew(false)} className="btn-icon shrink-0" type="button" aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              <div>
                <label className="text-xs font-bold flex items-center justify-between mb-1.5">
                  <span>Tiêu đề <span className="text-rose-500">*</span></span>
                </label>
                <input
                  className="input"
                  placeholder="Nhập tiêu đề thông báo..."
                  value={newTitle}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <div className="text-[10px] text-slate-500 text-right mt-1">{newTitle.length}/{TITLE_MAX}</div>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block">Nội dung <span className="font-normal text-slate-500">(tuỳ chọn)</span></label>
                <textarea
                  className="input min-h-[90px] resize-none"
                  placeholder="Nhập nội dung chi tiết..."
                  value={newBody}
                  maxLength={BODY_MAX}
                  onChange={(e) => setNewBody(e.target.value)}
                />
                <div className="text-[10px] text-slate-500 text-right mt-1">{newBody.length}/{BODY_MAX}</div>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block">Đường link <span className="font-normal text-slate-500">(tuỳ chọn)</span></label>
                <div className="flex items-center gap-2 border border-[var(--border)] rounded-lg bg-[var(--panel2)] px-3 py-2.5">
                  <Link2 size={14} className="text-slate-500 shrink-0" />
                  <input
                    className="bg-transparent outline-none text-xs w-full"
                    placeholder="https://..."
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block">Đính kèm file <span className="font-normal text-slate-500">(tuỳ chọn)</span></label>
                {newFile ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--panel2)] px-3 py-2.5">
                    <FileText size={16} className="text-rose-400 shrink-0" />
                    <span className="text-xs text-[var(--text)] truncate flex-1">{newFile.fileName}</span>
                    <button
                      onClick={() => setNewFile(null)}
                      className="text-slate-400 hover:text-rose-500 transition shrink-0"
                      type="button"
                      aria-label="Bỏ file đã chọn"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-1.5 text-center rounded-xl border-2 border-dashed px-4 py-7 cursor-pointer transition ${
                      dragActive ? "border-[#1b98e0] bg-[#1b98e0]/5" : "border-[var(--border-soft)] hover:bg-[var(--panel2)]"
                    }`}
                  >
                    {uploadingFile ? <Spinner size={20} /> : <Upload size={22} className="text-[#1b98e0]" />}
                    <div className="text-xs font-bold mt-1">
                      {uploadingFile ? "Đang tải file..." : (
                        <>Chọn file <span className="font-normal text-slate-500">hoặc kéo thả vào đây</span></>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">Hỗ trợ file .doc, .docx, .pdf (Tối đa 10MB)</div>
                    <input
                      type="file"
                      accept=".doc,.docx,.pdf"
                      className="hidden"
                      onChange={handleFilePick}
                      disabled={uploadingFile}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block">Phạm vi hiển thị</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScope("general")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition ${
                      scope === "general"
                        ? "border-[#1b98e0] bg-[#1b98e0]/5"
                        : "border-[var(--border-soft)] hover:bg-[var(--panel2)]"
                    }`}
                  >
                    <Users size={18} className={scope === "general" ? "text-[#1b98e0]" : "text-slate-500"} />
                    <span className="text-xs font-bold">Chung</span>
                    <span className="text-[10px] text-slate-500">Tất cả thành viên</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Tính năng đang được phát triển"
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-[var(--border-soft)] px-3 py-4 opacity-45 cursor-not-allowed"
                  >
                    <KeyRound size={18} className="text-slate-500" />
                    <span className="text-xs font-bold">Riêng tư</span>
                    <span className="text-[10px] text-slate-500">Chỉ người được chọn</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 text-xs font-semibold rounded-lg border border-[var(--border)] py-2.5 hover:bg-[var(--panel2)] transition"
                  type="button"
                >
                  Hủy
                </button>
                <button
                  onClick={sendAnnounce}
                  disabled={!newTitle.trim() || uploadingFile}
                  className="btn-primary flex-1 text-xs justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  type="button"
                >
                  <Bell size={13} /> Gửi thông báo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
          <div className="relative glass rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in border border-[var(--border-soft)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#1b98e0]/10 grid place-items-center">
                  <HelpCircle size={16} className="text-violet-400" />
                </div>
                <h3 className="font-extrabold text-lg">Trợ giúp nhanh</h3>
              </div>
              <button onClick={() => setHelpOpen(false)} className="btn-icon" type="button" aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-3 text-xs">
              <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /> Vào <b>Trend Radar</b> để xem xu hướng đang nổi rồi bấm "Phân tích BĐS" để chuyển sang tạo content.</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /> Dùng <b>AI Content Studio</b> để sinh hook, kịch bản, caption & hashtag tự động, sau đó lưu vào Content Manager.</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /> Mỗi lead mới có thể đổi trạng thái ngay trong trang <b>Leads</b>.</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /> Cấu hình thương hiệu, AI và n8n tại <b>Cài đặt hệ thống</b>.</li>
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}

function EmptyNotifState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="py-10 text-center">
      <div className="relative h-16 w-16 mx-auto mb-4">
        <span className="absolute inset-0 rounded-full bg-[#1b98e0]/10 animate-pulse" />
        <span className="absolute inset-2 rounded-full bg-[#1b98e0]/15 grid place-items-center">
          <Bell size={22} className="text-[#1b98e0]" />
        </span>
      </div>
      <div className="text-sm font-extrabold">{title}</div>
      <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

function SearchGroup({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
        <Icon size={11} /> {label}
      </div>
      {children}
    </div>
  );
}

function SearchItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full text-left px-2 py-2 rounded-lg text-xs hover:bg-[var(--panel2)] transition truncate"
    >
      {children}
    </button>
  );
}