"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useToast } from "./toast";
import { presenceLabel, isOnline } from "@/lib/presence";
import { Search, Send, UserPlus, UserCheck, MessageCircle, X, Plus, Users, Image as ImageIcon, Smile, Youtube, Music2, Facebook, Instagram, Undo2, Trash2, Settings } from "./icons";

type ConvUser = { id: number; name: string; email: string; role: string; avatar?: string | null; lastActiveAt?: string | null; online?: boolean };
type Conv = { user: ConvUser; lastMessage: { id: number; content: string; mine: boolean; recalled?: boolean; createdAt: string } | null; unread: number; online?: boolean };
type Msg = { id: number; senderId: number; receiverId: number; content: string; read: boolean; createdAt: string; imageUrl?: string | null; recalled?: boolean };
type GroupConv = { id: number; name: string; createdById: number; unread: number; members: ConvUser[]; lastMessage: { senderId: number; senderName: string; content: string; recalled?: boolean; createdAt: string } | null };
type GroupMsg = { id: number; groupId: number; senderId: number; sender: { id: number; name: string; avatar?: string | null }; content: string; imageUrl?: string | null; recalled?: boolean; seenByCount?: number; createdAt: string };
type PublicProfile = { id: number; name: string; email: string; role: string; jobTitle?: string | null; phone?: string | null; bio?: string | null; avatar?: string | null; socialYoutube?: string | null; socialTiktok?: string | null; socialFacebook?: string | null; socialInstagram?: string | null };
type SearchUser = ConvUser & { relation: string };

const EMOJIS = ["😀", "😂", "🥰", "😍", "😎", "🤔", "😮", "😢", "😭", "😡", "👍", "👎", "👏", "🙏", "💪", "🤝", "❤️", "🔥", "🎉", "✅", "⭐", "🎯", "💯", "☕", "🏠", "🚀"];

function fmtTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function initials(n: string) {
  return n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
}
function Avatar({ src, name, size = 36, rounded = "rounded-full", text = "" }: { src?: string | null; name: string; size?: number; rounded?: string; text?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${rounded} object-cover shrink-0`} style={{ width: size, height: size }} />;
  }
  return (
    <span className={`bg-[#1b98e0] grid place-items-center text-white font-bold shrink-0 ${rounded}`} style={{ width: size, height: size, fontSize: Math.max(9, size * 0.35) }}>
      {text || initials(name)}
    </span>
  );
}

/** Chấm trạng thái online (xanh) / offline (xám) đặt ở góc avatar. */
function PresenceDot({ online, size = 10 }: { online?: boolean; size?: number }) {
  return (
    <span
      className={`absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg)] ${online ? "bg-emerald-400" : "bg-slate-500"}`}
      style={{ width: size, height: size }}
    />
  );
}

export default function ChatPanel() {
  const toast = useToast();
  const [myId, setMyId] = useState<number | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [incoming, setIncoming] = useState<ConvUser[]>([]);
  const [active, setActive] = useState<ConvUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activePresence, setActivePresence] = useState("");
  const [text, setText] = useState("");
  const [groups, setGroups] = useState<GroupConv[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupConv | null>(null);
  const [groupMsgs, setGroupMsgs] = useState<GroupMsg[]>([]);
  const [groupText, setGroupText] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createName, setCreateName] = useState("");
  const [selMembers, setSelMembers] = useState<number[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<SearchUser[]>([]);
  const [groupAddOpen, setGroupAddOpen] = useState(false);
  const [groupAddSearch, setGroupAddSearch] = useState("");
  const [groupAddResults, setGroupAddResults] = useState<SearchUser[]>([]);
  const [selAddMembers, setSelAddMembers] = useState<number[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    try {
      const [cRes, fRes, gRes] = await Promise.all([fetch("/api/messages/conversations"), fetch("/api/friends"), fetch("/api/groups")]);
      const c = await cRes.json();
      const f = await fRes.json();
      const g = await gRes.json();
      if (c.ok) { setConvs(c.conversations || []); setMyId(c.myId); }
      if (f.ok) setIncoming(f.incoming || []);
      if (g.ok) setGroups(g.groups || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll tin nhắn mới + danh sách hội thoại (3 giây) — theo cả hội thoại cá nhân VÀ nhóm
  useEffect(() => {
    const t = setInterval(() => {
      loadAll();
      if (active) loadThread(active.id);
      if (activeGroup) loadGroupThread(activeGroup.id);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, active]);

  async function loadThread(userId: number) {
    const res = await fetch(`/api/messages?with=${userId}`);
    const d = await res.json();
    if (d.ok) {
      setMessages(d.messages || []);
      if (d.other) setActivePresence(presenceLabel(d.other.lastActiveAt, d.other.online));
    }
  }

  function openChat(u: ConvUser) {
    setActive(u);
    setMessages([]);
    setActiveGroup(null);
    setGroupMsgs([]);
    setGroupMenuOpen(false);
    loadThread(u.id);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    const content = text.trim();
    setText("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: active.id, content }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Gửi thất bại");
      setMessages((m) => [...m, d.message]);
      loadAll();
    } catch (err: any) {
      toast.error("Không gửi được", err.message || String(err));
      setText(content);
    }
  }

  async function loadGroupThread(groupId: number) {
    const res = await fetch(`/api/groups/${groupId}/messages`);
    const d = await res.json();
    if (d.ok) setGroupMsgs(d.messages || []);
  }
  function openGroup(g: GroupConv) {
    setActiveGroup(g);
    setGroupMsgs([]);
    setActive(null);
    setMessages([]);
    setGroupMenuOpen(false);
    loadGroupThread(g.id);
  }

  async function sendGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroup) return;
    const content = groupText.trim();
    if (!content) return;
    setGroupText("");
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Gửi thất bại");
      setGroupMsgs((m) => [...m, d.message]);
      loadAll();
    } catch (err: any) {
      toast.error("Không gửi được", err.message || String(err));
      setGroupText(content);
    }
  }

  async function sendImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const up = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const ud = await up.json();
      if (!up.ok || !ud.ok) throw new Error(ud.error || "Tải ảnh thất bại");
      if (activeGroup) {
        const res = await fetch(`/api/groups/${activeGroup.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: ud.url }) });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d.error || "Gửi thất bại");
        setGroupMsgs((m) => [...m, d.message]);
      } else if (active) {
        const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: active.id, imageUrl: ud.url }) });
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error(d.error || "Gửi thất bại");
        setMessages((m) => [...m, d.message]);
      }
      loadAll();
    } catch (err: any) {
      toast.error("Không gửi được ảnh", err.message || String(err));
    }
  }

  async function doCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || selMembers.length === 0) { toast.error("Nhập tên nhóm và chọn thành viên"); return; }
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, memberIds: selMembers }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Tạo nhóm thất bại");
      toast.success("Đã tạo nhóm", createName);
      setShowCreateGroup(false); setCreateName(""); setSelMembers([]);
      loadAll();
    } catch (err: any) {
      toast.error("Không tạo được nhóm", err.message || String(err));
    }
  }

  async function viewProfile(uid: number) {
    try {
      const res = await fetch(`/api/users/${uid}/profile`);
      const d = await res.json();
      if (d.ok) setProfile(d.user);
    } catch {}
  }

  function toggleMember(uid: number) {
    setSelMembers((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  }

  // Tìm kiếm kết bạn (debounce 300ms)
  useEffect(() => {
    if (!q.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q.trim())}`);
        const d = await res.json();
        if (d.ok) setSearchResults(d.users || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Tìm mọi người dùng để thêm vào nhóm (kể cả chưa kết bạn / chưa từng nhắn) — debounce 250ms
  useEffect(() => {
    if (!groupSearch.trim()) { setGroupSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(groupSearch.trim())}`);
        const d = await res.json();
        if (d.ok) setGroupSearchResults(d.users || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [groupSearch]);

  // Tìm người dùng để thêm vào nhóm ĐANG MỞ (trong menu Cài đặt nhóm)
  useEffect(() => {
    if (!groupAddSearch.trim()) { setGroupAddResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(groupAddSearch.trim())}`);
        const d = await res.json();
        if (d.ok) setGroupAddResults(d.users || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [groupAddSearch]);

  async function addFriend(id: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId: id }) });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Thất bại");
      toast.success("Kết bạn", d.message || "Đã gửi lời mời");
      loadAll();
      setSearchResults((r) => r.map((u) => (u.id === id ? { ...u, relation: "pending" } : u)));
    } catch (err: any) {
      toast.error("Không kết bạn được", err.message || String(err));
    } finally { setBusy(false); }
  }

  async function acceptFriend(id: number) {
    try {
      const res = await fetch("/api/friends/accept", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId: id }) });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Thất bại");
      toast.success("Đã kết bạn");
      loadAll();
    } catch (err: any) { toast.error("Lỗi", err.message || String(err)); }
  }
  async function rejectFriend(id: number) {
    try {
      await fetch(`/api/friends?friendId=${id}`, { method: "DELETE" });
      loadAll();
    } catch {}
  }
  async function unfriend(id: number) {
    const cf = await Swal.fire({
      title: "Huỷ kết bạn?",
      text: "Bạn có chắc muốn huỷ kết bạn với người này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Huỷ kết bạn",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      await fetch(`/api/friends?friendId=${id}`, { method: "DELETE" });
      toast.success("Đã huỷ kết bạn");
      if (active?.id === id) { setActive(null); setMessages([]); }
      loadAll();
    } catch {}
  }

  async function msgAction(id: number, action: "recall" | "delete") {
    if (action === "delete") {
      const cf = await Swal.fire({
        title: "Xoá tin nhắn?",
        text: "Tin nhắn này sẽ bị xoá khỏi cuộc trò chuyện.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#dc2626",
      });
      if (!cf.isConfirmed) return;
    }
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Thất bại");
      if (action === "delete") setMessages((m) => m.filter((x) => x.id !== id));
      else if (active) loadThread(active.id);
      toast.success(action === "recall" ? "Đã thu hồi tin nhắn" : "Đã xoá tin nhắn");
    } catch (err: any) {
      toast.error("Không thực hiện được", err.message || String(err));
    }
  }

  async function groupMsgAction(id: number, action: "recall" | "delete") {
    if (!activeGroup) return;
    if (action === "delete") {
      const cf = await Swal.fire({
        title: "Xoá tin nhắn?",
        text: "Tin nhắn này sẽ bị xoá khỏi nhóm.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#dc2626",
      });
      if (!cf.isConfirmed) return;
    }
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Thất bại");
      if (action === "delete") setGroupMsgs((m) => m.filter((x) => x.id !== id));
      else loadGroupThread(activeGroup.id);
      toast.success(action === "recall" ? "Đã thu hồi tin nhắn" : "Đã xoá tin nhắn");
    } catch (err: any) {
      toast.error("Không thực hiện được", err.message || String(err));
    }
  }

  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const isGroupCreator = !!activeGroup && !!myId && activeGroup.createdById === myId;

  /** Rời nhóm (thành viên). Nếu là trưởng nhóm → tự giải tán nhóm. */
  async function leaveGroup() {
    if (!activeGroup) return;
    const cf = await Swal.fire({
      title: "Rời nhóm?",
      text: "Bạn có chắc muốn rời khỏi nhóm này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Rời nhóm",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#f59e0b",
    });
    if (!cf.isConfirmed) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không thể rời nhóm");
      toast.success(d.dissolved ? "Đã giải tán nhóm" : "Đã rời nhóm");
      setActiveGroup(null);
      setGroupMsgs([]);
      setGroupMenuOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error("Không rời được nhóm", err.message || String(err));
    }
  }

  /** Giải tán nhóm (chỉ trưởng nhóm). */
  async function dissolveGroup() {
    if (!activeGroup) return;
    const cf = await Swal.fire({
      title: "Giải tán nhóm?",
      text: "Toàn bộ tin nhắn trong nhóm sẽ bị xoá. Hành động này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Giải tán",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không thể giải tán nhóm");
      toast.success("Đã giải tán nhóm");
      setActiveGroup(null);
      setGroupMsgs([]);
      setGroupMenuOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error("Không giải tán được", err.message || String(err));
    }
  }

  /** Kích thành viên ra khỏi nhóm (chỉ trưởng nhóm). */
  async function kickMember(uid: number) {
    if (!activeGroup) return;
    const cf = await Swal.fire({
      title: "Kích thành viên?",
      text: "Kích thành viên này ra khỏi nhóm?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Kích",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!cf.isConfirmed) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kick", userId: uid }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không thể kích thành viên");
      toast.success("Đã kích thành viên khỏi nhóm");
      loadAll();
      if (activeGroup) loadGroupThread(activeGroup.id);
    } catch (err: any) {
      toast.error("Không kích được", err.message || String(err));
    }
  }

  /** Thêm thành viên vào nhóm đang mở (chỉ trưởng nhóm). */
  async function addMembers() {
    if (!activeGroup || selAddMembers.length === 0) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", memberIds: selAddMembers }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Không thêm được thành viên");
      toast.success("Đã thêm thành viên", `Thêm ${d.added ?? selAddMembers.length} người vào nhóm`);
      // Làm mới danh sách nhóm + cập nhật nhóm đang mở để thấy thành viên mới
      const gRes = await fetch("/api/groups");
      const gData = await gRes.json();
      if (gData.ok) {
        setGroups(gData.groups || []);
        const updated = (gData.groups || []).find((x: any) => x.id === activeGroup.id);
        if (updated) setActiveGroup(updated);
      }
      setSelAddMembers([]);
      setGroupAddSearch("");
      setGroupAddResults([]);
      setGroupAddOpen(false);
      if (activeGroup) loadGroupThread(activeGroup.id);
    } catch (err: any) {
      toast.error("Không thêm được", err.message || String(err));
    }
  }

  if (loading) return <div className="card p-10 h-[70vh] skeleton" />;

  return (
    <div className="card overflow-hidden grid lg:grid-cols-[300px_1fr] h-[calc(100vh-170px)] min-h-[500px]">
      {/* ===== Cột trái: tìm bạn + hội thoại ===== */}
      <aside className="flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-soft)] bg-[var(--panel2)]/40">
        <div className="p-3 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3">
            <Search size={14} className="text-slate-500" />
            <input className="bg-transparent outline-none text-xs w-full py-2" placeholder="Tìm tên, email để kết bạn..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-auto">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--panel)]">
                  <Avatar src={u.avatar} name={u.name} size={24} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-bold truncate">{u.name}</span>
                    <span className="block text-[9px] text-slate-500 truncate">{u.email}</span>
                  </span>
                  {u.relation === "none" && (
                    <button onClick={() => addFriend(u.id)} disabled={busy} className="text-[9px] font-bold text-[#1b98e0] hover:underline shrink-0" type="button">
                      <UserPlus size={13} /> Kết bạn
                    </button>
                  )}
                  {u.relation === "pending" && <span className="text-[9px] text-slate-500 shrink-0">Đã gửi</span>}
                  {u.relation === "incoming" && (
                    <button onClick={() => acceptFriend(u.id)} className="text-[9px] font-bold text-emerald-400 hover:underline shrink-0" type="button">
                      <UserCheck size={13} /> Đồng ý
                    </button>
                  )}
                  {u.relation === "accepted" && (
                    <button onClick={() => openChat({ id: u.id, name: u.name, email: u.email, role: u.role })} className="text-[9px] font-bold text-[#1b98e0] hover:underline shrink-0" type="button">
                      <MessageCircle size={13} /> Nhắn
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {incoming.length > 0 && (
          <div className="p-3 border-b border-[var(--border-soft)]">
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-400 mb-2">Lời mời kết bạn</div>
            <div className="space-y-1.5">
              {incoming.map((u) => (
                <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--panel)]">
                  <Avatar src={u.avatar} name={u.name} size={28} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-bold truncate">{u.name}</span>
                    <span className="block text-[9px] text-slate-500 truncate">{u.email}</span>
                  </span>
                  <button onClick={() => acceptFriend(u.id)} className="btn-primary text-[9px] px-2 py-1" type="button" title="Chấp nhận"><UserCheck size={12} /></button>
                  <button onClick={() => rejectFriend(u.id)} className="btn-ghost text-[9px] px-2 py-1 text-rose-400" type="button" title="Từ chối"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Hội thoại</span>
            <button onClick={() => setShowCreateGroup(true)} className="text-[10px] font-bold text-[#1b98e0] hover:underline flex items-center gap-0.5" type="button"><Plus size={11} /> Tạo nhóm</button>
          </div>

          {groups.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 px-2 pb-1">Nhóm</div>
              {groups.map((g) => (
                <button key={g.id} onClick={() => openGroup(g)} className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition ${activeGroup?.id === g.id ? "bg-[#1b98e0]/15 ring-1 ring-[#1b98e0]/30" : "hover:bg-[var(--panel2)]"}`} type="button">
                  <span className="h-9 w-9 rounded-xl bg-[#1b98e0]/15 border border-[#1b98e0]/30 grid place-items-center text-[#1b98e0] shrink-0"><Users size={15} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{g.name}</span>
                      {g.unread > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center shrink-0">
                          {g.unread > 99 ? "99+" : g.unread}
                        </span>
                      )}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {g.lastMessage
                        ? g.lastMessage.recalled
                          ? `${g.lastMessage.senderName}: đã thu hồi tin nhắn`
                          : `${g.lastMessage.senderName}: ${g.lastMessage.content}`
                        : `${g.members.length} thành viên`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 px-2 pb-1">Cá nhân</div>
          {convs.length === 0 ? (
            <div className="text-center text-[11px] text-slate-500 py-8 px-3">
              Chưa có hội thoại cá nhân nào.
              <br />Tìm tên đồng nghiệp ở trên để kết bạn & chat!
            </div>
          ) : (
            <div className="space-y-1">
              {convs.map((c) => (
                <button
                  key={c.user.id}
                  onClick={() => openChat(c.user)}
                  className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition ${active?.id === c.user.id ? "bg-[#1b98e0]/15 ring-1 ring-[#1b98e0]/30" : "hover:bg-[var(--panel2)]"}`}
                  type="button"
                >
                  <span className="relative shrink-0">
                    <Avatar src={c.user.avatar} name={c.user.name} size={36} />
                    <PresenceDot online={c.online ?? isOnline(c.user.lastActiveAt)} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{c.user.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {c.unread > 0 && (
                          <span className="h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                        {c.lastMessage && <span className="text-[9px] text-slate-500">{fmtTime(c.lastMessage.createdAt)}</span>}
                      </span>
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {c.lastMessage
                        ? c.lastMessage.recalled
                          ? "Đã thu hồi tin nhắn"
                          : `${c.lastMessage.mine ? "Bạn: " : ""}${c.lastMessage.content}`
                        : "Bắt đầu trò chuyện"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ===== Khung chat ===== */}
      <section className="flex flex-col min-w-0">
        {!active && !activeGroup ? (
          <div className="flex-1 grid place-items-center text-slate-500 text-sm p-6">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto mb-3 text-slate-600" />
              Chọn một hội thoại hoặc nhóm để bắt đầu nhắn tin
            </div>
          </div>
        ) : activeGroup ? (
          <>
            <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)]">
              <span className="h-9 w-9 rounded-xl bg-[#1b98e0]/15 border border-[#1b98e0]/30 grid place-items-center text-[#1b98e0] shrink-0"><Users size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{activeGroup.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{activeGroup.members.map((m) => m.name).join(", ")}</div>
              </div>
              <div className="relative shrink-0">
                <button onClick={() => setGroupMenuOpen((v) => !v)} className="btn-icon" type="button" title="Quản lý nhóm" aria-label="Quản lý nhóm">
                  <Settings size={15} />
                </button>
                {groupMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-72 glass rounded-xl p-2 shadow-2xl border border-[var(--border-soft)] animate-in">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 px-2 py-1.5">Thành viên ({activeGroup.members.length})</div>
                    <div className="max-h-48 overflow-auto space-y-0.5 mb-2">
                      {activeGroup.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--panel2)]">
                          <span className="relative shrink-0">
                            <Avatar src={m.avatar} name={m.name} size={24} />
                            <PresenceDot online={m.online ?? isOnline(m.lastActiveAt)} size={8} />
                          </span>
                          <span className="flex-1 min-w-0 text-[11px] font-bold truncate">
                            {m.name}
                            {m.id === activeGroup.createdById && <span className="ml-1 text-[9px] font-normal text-amber-400">(trưởng nhóm)</span>}
                            {m.id === myId && <span className="ml-1 text-[9px] font-normal text-[#1b98e0]">(bạn)</span>}
                          </span>
                          {isGroupCreator && m.id !== myId && (
                            <button onClick={() => kickMember(m.id)} className="text-[10px] font-bold text-rose-400 hover:underline shrink-0" type="button">
                              Kích
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isGroupCreator && (
                      <>
                        <button onClick={() => setGroupAddOpen((v) => !v)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-[#1b98e0] hover:bg-[#1b98e0]/10" type="button">
                          <UserPlus size={13} /> {groupAddOpen ? "Đóng thêm thành viên" : "Thêm thành viên"}
                        </button>
                        {groupAddOpen && (
                          <div className="px-1 pb-1.5">
                            <input className="input !py-1.5 text-[11px] mb-1.5" placeholder="🔎 Tìm người dùng..." value={groupAddSearch} onChange={(e) => setGroupAddSearch(e.target.value)} />
                            <div className="max-h-40 overflow-auto space-y-0.5 mb-1.5">
                              {(groupAddSearch.trim() ? groupAddResults : convs).map((item: any) => {
                                const u = item?.user || item;
                                if (activeGroup.members.some((m) => m.id === u.id) || u.id === myId) return null;
                                const selected = selAddMembers.includes(u.id);
                                return (
                                  <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--panel2)] cursor-pointer">
                                    <input type="checkbox" checked={selected} onChange={() => setSelAddMembers((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))} />
                                    <Avatar src={u.avatar} name={u.name} size={22} />
                                    <span className="flex-1 min-w-0 text-[11px] font-bold truncate">{u.name}</span>
                                  </label>
                                );
                              })}
                              {groupAddSearch.trim() && groupAddResults.length === 0 && (
                                <div className="text-[10px] text-slate-500 py-2 text-center">Không tìm thấy ai.</div>
                              )}
                            </div>
                            <button onClick={addMembers} disabled={selAddMembers.length === 0} className="btn-primary w-full justify-center text-[11px] !py-1.5 disabled:opacity-40" type="button">
                              <UserPlus size={12} /> Thêm ({selAddMembers.length})
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {isGroupCreator ? (
                      <button onClick={dissolveGroup} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10" type="button">
                        <Trash2 size={13} /> Giải tán nhóm
                      </button>
                    ) : (
                      <button onClick={leaveGroup} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10" type="button">
                        <X size={13} /> Rời nhóm
                      </button>
                    )}
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {groupMsgs.length === 0 && <div className="text-center text-xs text-slate-500 py-10">Chưa có tin nhắn. Hãy gửi lời chào!</div>}
              {groupMsgs.map((m) => {
                const mine = m.senderId === myId;
                return (
                  <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <Avatar src={m.sender.avatar} name={m.sender.name} size={26} />}
                    <div className="max-w-[70%] min-w-0">
                      {!mine && <div className="text-[9px] font-bold text-[#1b98e0] mb-0.5 px-1">{m.sender.name}</div>}
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${mine ? "bg-[#1b98e0] text-white rounded-br-sm" : "bg-[var(--panel2)] text-[var(--text)] rounded-bl-sm border border-[var(--border-soft)]"}`}>
                        {m.recalled ? (
                          <div className="italic opacity-70 text-[11px]">{mine ? "Bạn đã thu hồi tin nhắn" : `${m.sender.name} đã thu hồi tin nhắn`}</div>
                        ) : (
                          <>
                            {m.imageUrl && <img src={m.imageUrl} alt="" className="rounded-lg max-h-48 object-cover mb-1" />}
                            {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                          </>
                        )}
                        <div className={`text-[9px] mt-1 ${mine ? "text-white/70 text-right" : "text-slate-500"}`}>
                          {mine && (m.seenByCount ?? 0) > 0 && <span className="font-semibold">{m.seenByCount} người đã xem</span>}
                          {mine && (m.seenByCount ?? 0) > 0 && " • "}
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                    {mine && !m.recalled && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                        <button onClick={() => groupMsgAction(m.id, "recall")} className="h-6 w-6 grid place-items-center rounded text-slate-400 hover:text-amber-300 hover:bg-[var(--panel2)]" title="Thu hồi" type="button"><Undo2 size={13} /></button>
                        <button onClick={() => groupMsgAction(m.id, "delete")} className="h-6 w-6 grid place-items-center rounded text-slate-400 hover:text-rose-400 hover:bg-[var(--panel2)]" title="Xoá" type="button"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="relative">
              {showEmoji && (
                <div className="absolute bottom-full left-2 mb-1 z-20 w-72 glass rounded-xl p-2 grid grid-cols-8 gap-1 shadow-2xl border border-[var(--border-soft)]">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { setGroupText((t) => t + e); setShowEmoji(false); }} className="text-lg hover:bg-[var(--panel2)] rounded-lg py-1" type="button">{e}</button>
                  ))}
                </div>
              )}
              <form onSubmit={sendGroup} className="flex items-center gap-2 p-3 border-t border-[var(--border-soft)]">
                <button type="button" onClick={() => setShowEmoji((v) => !v)} className="btn-ghost px-2.5" title="Emoji"><Smile size={16} /></button>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-ghost px-2.5" title="Gửi ảnh"><ImageIcon size={16} /></button>
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendImage(f); }} />
                <input className="input !py-2.5 flex-1" placeholder="Nhắn tin cho nhóm..." value={groupText} onChange={(e) => setGroupText(e.target.value)} />
                <button type="submit" disabled={!groupText.trim()} className="btn-primary px-4 !py-2.5 disabled:opacity-40" title="Gửi"><Send size={15} /></button>
              </form>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)]">
              <button onClick={() => viewProfile(active!.id)} className="shrink-0 relative group" title="Xem hồ sơ">
                <Avatar src={active!.avatar} name={active!.name} size={36} />
                <PresenceDot online={activePresence === "Đang hoạt động"} />
              </button>
              <button onClick={() => viewProfile(active!.id)} className="flex-1 min-w-0 text-left" title="Xem hồ sơ" type="button">
                <div className="text-sm font-bold truncate">{active!.name} <span className="text-[9px] text-[#1b98e0] font-semibold">• xem hồ sơ</span></div>
                <div className={`text-[10px] truncate ${activePresence === "Đang hoạt động" ? "text-emerald-400" : "text-slate-500"}`}>{activePresence || active!.role || active!.email}</div>
              </button>
              <button onClick={() => unfriend(active!.id)} className="btn-ghost text-[10px] text-rose-400 px-2 py-1" type="button" title="Huỷ kết bạn">
                Huỷ kết bạn
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 && <div className="text-center text-xs text-slate-500 py-10">Chưa có tin nhắn. Hãy gửi lời chào!</div>}
              {messages.map((m) => {
                const mine = m.senderId === myId;
                return (
                  <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <Avatar src={active!.avatar} name={active!.name} size={26} />}
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${mine ? "bg-[#1b98e0] text-white rounded-br-sm" : "bg-[var(--panel2)] text-[var(--text)] rounded-bl-sm border border-[var(--border-soft)]"}`}>
                      {m.recalled ? (
                        <div className="italic opacity-70 text-[11px]">{mine ? "Bạn đã thu hồi tin nhắn" : "Đã thu hồi tin nhắn"}</div>
                      ) : (
                        <>
                          {m.imageUrl && <img src={m.imageUrl} alt="" className="rounded-lg max-h-48 object-cover mb-1" />}
                          {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                        </>
                      )}
                      <div className={`text-[9px] mt-1 ${mine ? "text-white/70 text-right" : "text-slate-500"}`}>
                        {mine && <span className="font-semibold">{m.read ? "Đã xem ✓✓" : "Đã gửi ✓"}</span>}
                        {mine && " • "}
                        {fmtTime(m.createdAt)}
                      </div>
                    </div>
                    {mine && !m.recalled && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                        <button onClick={() => msgAction(m.id, "recall")} className="h-6 w-6 grid place-items-center rounded text-slate-400 hover:text-amber-300 hover:bg-[var(--panel2)]" title="Thu hồi" type="button"><Undo2 size={13} /></button>
                        <button onClick={() => msgAction(m.id, "delete")} className="h-6 w-6 grid place-items-center rounded text-slate-400 hover:text-rose-400 hover:bg-[var(--panel2)]" title="Xoá" type="button"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="relative">
              {showEmoji && (
                <div className="absolute bottom-full left-2 mb-1 z-20 w-72 glass rounded-xl p-2 grid grid-cols-8 gap-1 shadow-2xl border border-[var(--border-soft)]">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} className="text-lg hover:bg-[var(--panel2)] rounded-lg py-1" type="button">{e}</button>
                  ))}
                </div>
              )}
              <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-[var(--border-soft)]">
                <button type="button" onClick={() => setShowEmoji((v) => !v)} className="btn-ghost px-2.5" title="Emoji"><Smile size={16} /></button>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-ghost px-2.5" title="Gửi ảnh"><ImageIcon size={16} /></button>
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendImage(f); }} />
                <input className="input !py-2.5 flex-1" placeholder="Nhập tin nhắn..." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                <button type="submit" disabled={!text.trim()} className="btn-primary px-4 !py-2.5 disabled:opacity-40" title="Gửi"><Send size={15} /></button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* ===== Modal tạo nhóm ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)} />
          <form onSubmit={doCreateGroup} className="relative glass rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--border-soft)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Tạo nhóm chat</h3>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="btn-icon" aria-label="Đóng"><X size={18} /></button>
            </div>
            <input autoFocus className="input !py-2.5 mb-3" placeholder="Tên nhóm..." value={createName} onChange={(e) => setCreateName(e.target.value)} />
            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
              <span>
                Chọn thành viên
                {selMembers.length > 0 && <span className="text-[#1b98e0]"> ({selMembers.length})</span>}
              </span>
              {selMembers.length > 0 && (
                <button onClick={() => setSelMembers([])} className="text-[10px] text-rose-400 hover:underline" type="button">Bỏ chọn tất cả</button>
              )}
            </div>
            <input
              className="input !py-2 mb-2"
              placeholder="🔎 Tìm mọi người dùng (kể cả chưa kết bạn)..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
            />
            <div className="space-y-1 max-h-56 overflow-auto mb-4">
              {(groupSearch.trim() ? groupSearchResults : convs).map((item: any) => {
                const u = item?.user || item;
                const selected = selMembers.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--panel2)] cursor-pointer">
                    <input type="checkbox" checked={selected} onChange={() => toggleMember(u.id)} />
                    <Avatar src={u.avatar} name={u.name} size={28} />
                    <span className="flex-1 min-w-0">
                      <span className="text-xs font-bold truncate">{u.name}</span>
                      <span className="block text-[9px] text-slate-500 truncate">{u.email || u.role || ""}</span>
                    </span>
                    {selected && <span className="text-[10px] text-[#1b98e0] font-bold shrink-0">Đã chọn</span>}
                  </label>
                );
              })}
              {groupSearch.trim() && groupSearchResults.length === 0 && (
                <div className="text-[11px] text-slate-500 py-3 text-center">Không tìm thấy ai.</div>
              )}
              {!groupSearch.trim() && convs.length === 0 && (
                <div className="text-[11px] text-slate-500 py-3 text-center">Gõ tên người dùng vào ô trên để thêm vào nhóm.</div>
              )}
            </div>
            <button type="submit" className="btn-primary w-full justify-center"><Plus size={15} /> Tạo nhóm</button>
          </form>
        </div>
      )}

      {/* ===== Modal xem hồ sơ bạn bè ===== */}
      {profile && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProfile(null)} />
          <div className="relative glass rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-[var(--border-soft)]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Avatar src={profile.avatar} name={profile.name} size={56} />
                <div>
                  <div className="font-extrabold text-lg">{profile.name}</div>
                  <div className="text-[11px] text-[#1b98e0]">{profile.jobTitle || profile.role || profile.email}</div>
                </div>
              </div>
              <button onClick={() => setProfile(null)} className="btn-icon" aria-label="Đóng"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="text-slate-500">Email: </span><span className="text-slate-300">{profile.email}</span></div>
              {profile.phone && <div><span className="text-slate-500">SĐT: </span><span className="text-slate-300">{profile.phone}</span></div>}
              {profile.bio && <div className="text-slate-400 leading-relaxed pt-1">{profile.bio}</div>}
              {(profile.socialYoutube || profile.socialTiktok || profile.socialFacebook || profile.socialInstagram) && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border-soft)]">
                  {profile.socialYoutube && <a href={profile.socialYoutube} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-[#ff0000]/10 text-[#ff0000] grid place-items-center" title="YouTube"><Youtube size={14} /></a>}
                  {profile.socialTiktok && <a href={profile.socialTiktok} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-[var(--panel2)] text-slate-300 grid place-items-center" title="TikTok"><Music2 size={14} /></a>}
                  {profile.socialFacebook && <a href={profile.socialFacebook} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-[#1877f2]/10 text-[#1877f2] grid place-items-center" title="Facebook"><Facebook size={14} /></a>}
                  {profile.socialInstagram && <a href={profile.socialInstagram} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-[#e1306c]/10 text-[#e1306c] grid place-items-center" title="Instagram"><Instagram size={14} /></a>}
                </div>
              )}
            </div>
            <button onClick={() => { const u = { id: profile.id, name: profile.name, email: profile.email, role: profile.role }; setProfile(null); openChat(u); }} className="btn-primary w-full justify-center mt-5 text-xs">
              <MessageCircle size={13} /> Nhắn tin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

