"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "./toast";
import { Field, EmptyState } from "./ui";
import { UserPlus, User, Trash2, KeyRound, ShieldCheck, Settings, ChevronLeft, ChevronRight, Search, RotateCcw, Users, UserCheck, Crown, X, Check } from "./icons";
import * as Icons from "./icons";
import PasswordInput from "./PasswordInput";
import Swal from "sweetalert2";
import { type PermissionGroup } from "@/lib/permissions";
import { validatePassword } from "@/lib/passwordPolicy";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle?: string | null;
  active: boolean;
  permissions: string;
  avatar?: string | null;
};
type PermDef = PermissionGroup;

/** Icon của 1 nhóm quyền, tra theo g.icon; nếu tên icon không tồn tại thì dùng ShieldCheck làm dự phòng. */
function GroupIcon({ name, size = 14, className }: { name?: string; size?: number; className?: string }) {
  const I = (name && (Icons as any)[name]) || ShieldCheck;
  return <I size={size} className={className} />;
}

/** Suy ra loại thao tác (view/create/update/delete/...) từ permission key, dựa trên tên module. */
function actionTypeOf(g: PermissionGroup, key: string): string {
  return key === g.module ? "view" : key.slice(g.module.length + 1);
}

/** Icon + màu riêng cho từng loại thao tác, để phân biệt Xem/Thêm/Sửa/Xoá bằng mắt thay vì chỉ đọc chữ. */
const ACTION_ICON: Record<string, { icon: string; tone: string }> = {
  view: { icon: "Eye", tone: "text-sky-600" },
  viewall: { icon: "Eye", tone: "text-sky-600" },
  create: { icon: "Plus", tone: "text-emerald-600" },
  update: { icon: "Pencil", tone: "text-amber-600" },
  write: { icon: "Pencil", tone: "text-amber-600" },
  delete: { icon: "Trash2", tone: "text-rose-600" },
  upload: { icon: "Upload", tone: "text-violet-600" },
  download: { icon: "Download", tone: "text-violet-600" },
};
const DEFAULT_ACTION_ICON = { icon: "ShieldCheck", tone: "text-slate-500" };

/** Bảng màu chip theo loại thao tác — mỗi loại quyền có màu riêng để quét bằng mắt nhanh hơn.
 *  "solid" dùng riêng cho ô checkbox khi đã tick, để luôn đậm và rõ, không phụ thuộc "bg" nhạt. */
const ACTION_STYLE: Record<string, { bg: string; text: string; border: string; solid: string }> = {
  view: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-300", solid: "bg-sky-500" },
  viewall: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-300", solid: "bg-sky-500" },
  create: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", solid: "bg-emerald-500" },
  update: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", solid: "bg-amber-500" },
  write: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", solid: "bg-amber-500" },
  delete: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300", solid: "bg-rose-500" },
  upload: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300", solid: "bg-violet-500" },
  download: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300", solid: "bg-violet-500" },
};
const DEFAULT_ACTION_STYLE = { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", solid: "bg-slate-500" };

function ActionIcon({ action, size = 12 }: { action: string; size?: number }) {
  const cfg = ACTION_ICON[action] || DEFAULT_ACTION_ICON;
  const I = (Icons as any)[cfg.icon] || ShieldCheck;
  return <I size={size} className={`shrink-0 ${cfg.tone}`} />;
}

/** Menu được portal ra document.body, tự tính vị trí theo nút anchor,
 *  thoát khỏi mọi overflow/transform của bảng cha. */
function ActionMenu({
  anchorEl,
  onClose,
  children,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function computePos() {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 176; // w-44
      const margin = 8;

      let left = rect.right - menuWidth;
      if (left < margin) left = margin;
      if (left + menuWidth > window.innerWidth - margin) {
        left = window.innerWidth - menuWidth - margin;
      }

      let top = rect.bottom + 6;
      const estMenuHeight = menuRef.current?.offsetHeight ?? 160;
      if (top + estMenuHeight > window.innerHeight - margin) {
        top = rect.top - estMenuHeight - 6;
      }

      setPos({ top, left });
    }

    computePos();

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        e.target !== anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", computePos, true);
    window.addEventListener("resize", computePos);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", computePos, true);
      window.removeEventListener("resize", computePos);
    };
  }, [anchorEl, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      className="z-[999] w-44 glass rounded-xl p-1 shadow-2xl animate-in"
    >
      {children}
    </div>,
    document.body
  );
}

/** Chip bật/tắt quyền — có ô checkbox rõ ràng bên trong để biết ngay đang bật hay tắt,
 *  màu theo loại thao tác giúp quét bằng mắt nhanh hơn. */
function PermChip({
  checked,
  label,
  action,
  onChange,
  size = "sm",
}: {
  checked: boolean;
  label: string;
  action: string;
  onChange: () => void;
  size?: "sm" | "xs";
}) {
  const style = ACTION_STYLE[action] || DEFAULT_ACTION_STYLE;
  const boxSize = size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`flex items-center gap-1.5 rounded-lg border font-medium transition-all select-none
        ${size === "xs" ? "px-2 py-1 text-[10.5px]" : "px-2.5 py-1.5 text-[11px]"}
        ${checked
          ? `${style.bg} ${style.border} ${style.text}`
          : "bg-white border-[var(--border)] text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50"}`}
    >
      <span
        className={`shrink-0 grid place-items-center rounded border transition-colors ${boxSize}
          ${checked ? `${style.solid} border-transparent` : "border-slate-300 bg-white"}`}
      >
        {checked && <Check size={size === "xs" ? 9 : 10} className="text-white" strokeWidth={3} />}
      </span>
      <ActionIcon action={action} size={size === "xs" ? 11 : 12} />
      {label}
    </button>
  );
}

/** Khối chỉnh quyền dùng chung cho cả form tạo mới lẫn panel sửa quyền từng người —
 *  gồm thanh tổng quan (đã chọn bao nhiêu / tổng số) + lưới nhóm quyền, mỗi nhóm có
 *  công tắc "chọn tất cả" và các chip quyền theo màu thao tác. */
function PermissionsEditor({
  permList,
  selected,
  onToggleKey,
  onToggleModule,
  compact = false,
}: {
  permList: PermDef[];
  selected: string[];
  onToggleKey: (key: string) => void;
  onToggleModule: (g: PermissionGroup) => void;
  compact?: boolean;
}) {
  const totalKeys = permList.reduce((n, g) => n + g.actions.length, 0);
  const selectedCount = permList.reduce((n, g) => n + g.actions.filter((a) => selected.includes(a.key)).length, 0);
  const pct = totalKeys ? Math.round((selectedCount / totalKeys) * 100) : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
          {selectedCount}/{totalKeys} quyền đã chọn
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1b98e0] to-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className={`grid ${compact ? "sm:grid-cols-2" : "md:grid-cols-2"} gap-2.5`}>
        {permList.map((g) => {
          const keys = g.actions.map((a) => a.key);
          const allOn = keys.every((k) => selected.includes(k));
          const onCount = keys.filter((k) => selected.includes(k)).length;
          const anyOn = onCount > 0;
          return (
            <div
              key={g.module}
              className={`rounded-xl border p-2.5 transition-colors ${anyOn ? "border-[#1b98e0]/35 bg-[#1b98e0]/[0.035]" : "border-[var(--border)] bg-[var(--panel2)]"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 transition-colors ${anyOn ? "bg-[#1b98e0]/15 text-[#1b98e0]" : "bg-[var(--panel)] text-slate-400"}`}>
                    <GroupIcon name={g.icon} size={13} />
                  </span>
                  <span className="text-[12px] font-bold truncate">{g.label}</span>
                  {anyOn && <span className="text-[10px] font-semibold text-slate-400 shrink-0">{onCount}/{keys.length}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleModule(g)}
                  title={allOn ? "Bỏ tất cả" : "Chọn tất cả"}
                  className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${allOn ? "bg-[#1b98e0]" : anyOn ? "bg-[#1b98e0]/35" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all duration-150 ${allOn ? "left-[14px]" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.actions.map((p) => (
                  <PermChip
                    key={p.key}
                    checked={selected.includes(p.key)}
                    label={p.label}
                    action={actionTypeOf(g, p.key)}
                    onChange={() => onToggleKey(p.key)}
                    size={compact ? "xs" : "sm"}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UsersManager() {
  const toast = useToast();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ? Number(session.user.id) : undefined;
  const ROLES = ["Marketing","Video Editor","Admin"];
  const [users, setUsers] = useState<UserRow[]>([]);
  const [permList, setPermList] = useState<PermDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Marketing");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [newPassFor, setNewPassFor] = useState<{ id: number; password: string } | null>(null);
  const [resetTokenFor, setResetTokenFor] = useState<{ id: number; token: string; expires: number } | null>(null);
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState<{ id: number; el: HTMLElement } | null>(null);
  const [q, setQ] = useState("");
  const [fRole, setFRole] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lỗi tải dữ liệu");
      setUsers(data.users);
      setPermList(data.permissionList || []);
    } catch (err: any) {
      toast.error("Không tải được", err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function permsOf(u: UserRow): string[] {
    try { return JSON.parse(u.permissions || "[]"); } catch { return []; }
  }
  function isAdmin(u: UserRow) { return u.role === "Admin" || permsOf(u).includes("*"); }

  function togglePerm(u: UserRow, key: string) {
    const cur = permsOf(u);
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    updateUser(u.id, { permissions: next });
  }
  function groupKeys(g: PermissionGroup) { return g.actions.map((a) => a.key); }
  function toggleModuleAll(u: UserRow, g: PermissionGroup) {
    const keys = groupKeys(g);
    const cur = permsOf(u);
    const allOn = keys.every((k) => cur.includes(k));
    const next = allOn ? cur.filter((k) => !keys.includes(k)) : Array.from(new Set([...cur, ...keys]));
    updateUser(u.id, { permissions: next });
  }

  async function updateUser(id: number, patch: any) {
    // OPTIMISTIC UPDATE: cập nhật giao diện NGAY LẬP TỨC (quan trọng trên mobile —
    // trước đây phải chờ API + load lại toàn bộ danh sách (~vài giây trên Render free)
    // mới thấy tick), gọi API nền; nếu lỗi thì tải lại dữ liệu thật để hoàn tác.
    setUsers((arr) =>
      arr.map((u) => {
        if (u.id !== id) return u;
        const merged: any = { ...u, ...patch };
        // permissions trong state là chuỗi JSON (server nhận mảng rồi tự stringify)
        if (Array.isArray(patch.permissions)) merged.permissions = JSON.stringify(patch.permissions);
        return merged;
      })
    );
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Cập nhật thất bại");
      toast.success("Đã cập nhật tài khoản");
      router.refresh();
    } catch (err: any) {
      toast.error("Cập nhật thất bại", err.message || "");
      await load(); // khôi phục dữ liệu thật từ server
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const v = validatePassword(password);
    if (!v.ok) { toast.error("Mật khẩu không đạt chuẩn", v.message); return; }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, jobTitle, password, permissions: newPerms }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tạo thất bại");
      toast.success("Đã tạo tài khoản", email);
      setShowForm(false);
      setName(""); setEmail(""); setJobTitle(""); setPassword(""); setNewPerms([]);
      await load();
    } catch (err: any) { toast.error("Tạo thất bại", err.message || ""); }
  }

  async function remove(u: UserRow) {
    const result = await Swal.fire({
      title: "Xoá tài khoản?",
      text: `Bạn có chắc muốn xoá "${u.name}" (${u.email})? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/users?id=${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá tài khoản");
      await load();
    } catch (err: any) { toast.error("Xoá thất bại", err.message || ""); }
  }

  async function saveNewPassword() {
    if (!newPassFor?.password) return;
    const v = validatePassword(newPassFor.password);
    if (!v.ok) { toast.error("Mật khẩu không đạt chuẩn", v.message); return; }
    await updateUser(newPassFor.id, { password: newPassFor.password });
    setNewPassFor(null);
  }

  async function genResetToken(u: UserRow) {
    try {
      const res = await fetch("/api/users/reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tạo mã thất bại");
      setResetTokenFor({ id: u.id, token: data.token, expires: data.expiresInMinutes ?? 30 });
      toast.success("Đã tạo mã đặt lại", `Mã hiệu lực ${data.expiresInMinutes ?? 30} phút. Chuyển mã cho ${u.name}.`);
    } catch (err: any) { toast.error("Tạo mã thất bại", err.message || ""); }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Đã sao chép mã đặt lại");
    } catch { toast.error("Không sao chép được", "Hãy chép thủ công mã bên dưới."); }
  }

  function closeCreateForm() {
    setShowForm(false);
    setName(""); setEmail(""); setRole("Marketing"); setJobTitle(""); setPassword(""); setNewPerms([]);
  }

  return render();

  function render() {
    if (loading) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-20 skeleton" />)}
          </div>
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-48 skeleton" />)}
          </div>
        </div>
      );
    }
    const pageSize = 10;
    const query = q.trim().toLowerCase();
    const visibleUsers = users.filter((u) => {
      if (isAdmin(u)) return false;
      if (fRole && u.role !== fRole) return false;
      if (query && !`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const totalPages = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageUsers = visibleUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

    const activeCount = users.filter((x) => x.active).length;
    const adminCount = users.filter((x) => isAdmin(x)).length;

    return (
      <div className="space-y-6">
        {/* Thống kê nhanh */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card relative overflow-hidden p-4 animate-in">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1b98e0]/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tổng tài khoản</div>
                <div className="text-2xl font-black mt-1 text-[#1b98e0]">{users.length}</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-[#1b98e0]/10 grid place-items-center text-[#1b98e0]">
                <Users size={16} />
              </div>
            </div>
          </div>
          <div className="card relative overflow-hidden p-4 animate-in">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-400/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Đang hoạt động</div>
                <div className="text-2xl font-black mt-1 text-emerald-400">{activeCount}</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-400/10 grid place-items-center text-emerald-400">
                <UserCheck size={16} />
              </div>
            </div>
          </div>
          <div className="card relative overflow-hidden p-4 animate-in">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-400/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Quản trị viên</div>
                <div className="text-2xl font-black mt-1 text-amber-400">{adminCount}</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-400/10 grid place-items-center text-amber-400">
                <Crown size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Bộ lọc + nút thêm mới */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 focus-within:border-[#1b98e0]/50 transition-colors">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              className="bg-transparent outline-none text-xs w-full py-2.5"
              placeholder="Tìm theo tên, email, vai trò..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="text-slate-500 hover:text-slate-300 shrink-0">
                <X size={13} />
              </button>
            )}
          </div>
          <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="input !w-auto !py-2.5 text-xs rounded-xl">
            <option value="">Tất cả vai trò</option>
            {ROLES.filter((r) => r !== "Admin").map((r) => <option key={r}>{r}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs rounded-xl" type="button">
            <UserPlus size={15} /> Thêm tài khoản mới
          </button>
        </div>

        {/* @list@ */}
        {visibleUsers.length === 0 ? (
          <EmptyState title="Chưa có tài khoản" desc="Bấm 'Thêm tài khoản mới' để tạo nhân viên." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pageUsers.map((u) => {
                const self = sessionUserId === u.id;
                const showInlinePanel = newPassFor?.id === u.id || resetTokenFor?.id === u.id;
                const highlighted = showInlinePanel || editing?.id === u.id;
                return (
                  <div key={u.id} className={`card p-3.5 animate-in transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${highlighted ? "ring-1 ring-[#1b98e0]/40 border-[#1b98e0]/30" : ""}`}>
                    {/* Đầu thẻ: avatar + tên + email + huy hiệu */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar} alt={u.name} className="h-11 w-11 rounded-xl object-cover" />
                        ) : (
                          <div className={`h-11 w-11 rounded-xl grid place-items-center text-white text-sm font-black shadow-sm ${isAdmin(u) ? "bg-gradient-to-br from-amber-400 to-orange-600" : "bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8]"}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--panel)] ${u.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] truncate flex items-center gap-1.5">
                          {u.name}
                          {self && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#1b98e0]/12 text-[#1b98e0] shrink-0">Bạn</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                      </div>
                      {isAdmin(u) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400/12 text-amber-500 shrink-0 flex items-center gap-1">
                          <Crown size={9} /> ADMIN
                        </span>
                      )}
                    </div>

                    {/* Vai trò + trạng thái hoạt động */}
                    <div className="flex items-center justify-between gap-2 mt-3 px-2.5 py-2 rounded-lg bg-[var(--bg-2)]">
                      {isAdmin(u) && self ? (
                        <span className="text-[11px] font-semibold text-amber-500">Admin</span>
                      ) : (
                        <select className="bg-transparent outline-none text-[11px] font-medium w-auto cursor-pointer" value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value })} title="Đổi vai trò">
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10.5px] font-semibold ${u.active ? "text-emerald-500" : "text-rose-400"}`}>{isAdmin(u) ? "Admin" : (u.active ? "Hoạt động" : "Đã khoá")}</span>
                        <button onClick={() => updateUser(u.id, { active: !u.active })} disabled={self} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${u.active ? "bg-emerald-500" : "bg-slate-300"}`} type="button" title={self ? "Không thể vô hiệu hoá chính mình" : (u.active ? "Vô hiệu hoá tài khoản" : "Kích hoạt tài khoản")}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${u.active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </div>
                    {/* Chức vụ - sửa nhanh */}
                    <div className="mt-2">
                      <input
                        type="text"
                        defaultValue={u.jobTitle || ""}
                        placeholder="Chức vụ (VD: Chuyên viên Content TikTok)"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (u.jobTitle || "")) updateUser(u.id, { jobTitle: v || null });
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:border-[#1b98e0]/50 transition-colors"
                      />
                    </div>
                    </div>

                    {/* Nút thao tác nhanh */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <button
                        onClick={() => { setNewPassFor(null); setResetTokenFor(null); setEditing(u); }}
                        className={`flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[10.5px] font-semibold whitespace-nowrap transition-colors ${editing?.id === u.id ? "bg-[#1b98e0]/12 border-[#1b98e0]/50 text-[#1b98e0]" : "border-[var(--border)] text-slate-500 hover:text-slate-700 hover:bg-[var(--bg-2)]"}`}
                        type="button" title="Phân quyền"
                      >
                        <ShieldCheck size={13} /> <span className="whitespace-nowrap">Cấp quyền</span>
                      </button>
                      <button
                        onClick={() => { setEditing(null); setResetTokenFor(null); setNewPassFor(newPassFor?.id === u.id ? null : { id: u.id, password: "" }); }}
                        className={`flex items-center gap-1 h-7 px-2 rounded-lg border text-[10.5px] font-semibold whitespace-nowrap transition-colors ${newPassFor?.id === u.id ? "bg-[#1b98e0]/12 border-[#1b98e0]/50 text-[#1b98e0]" : "border-[var(--border)] text-slate-500 hover:text-slate-700 hover:bg-[var(--bg-2)]"}`}
                        type="button" title="Đổi mật khẩu"
                      >
                        <KeyRound size={13} /> <span className="whitespace-nowrap">Đổi mật khẩu</span>
                      </button>
                      <button
                        onClick={() => { setEditing(null); setNewPassFor(null); if (resetTokenFor?.id === u.id) { setResetTokenFor(null); } else { setResetTokenFor(null); genResetToken(u); } }}
                        className={`flex items-center gap-1 h-7 px-2 rounded-lg border text-[10.5px] font-semibold whitespace-nowrap transition-colors ${resetTokenFor?.id === u.id ? "bg-[#1b98e0]/12 border-[#1b98e0]/50 text-[#1b98e0]" : "border-[var(--border)] text-slate-500 hover:text-slate-700 hover:bg-[var(--bg-2)]"}`}
                        type="button" title="Tạo mã đặt lại mật khẩu"
                      >
                        <RotateCcw size={13} /> <span className="whitespace-nowrap">Cấp mã quên MK</span>
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => remove(u)}
                        disabled={isAdmin(u) && users.filter(isAdmin).length === 1}
                        className="h-7 w-7 shrink-0 grid place-items-center rounded-lg border border-transparent text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 disabled:opacity-40 transition-colors"
                        type="button" title="Xoá tài khoản"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Panel mở rộng: mật khẩu / mã đặt lại (Quyền giờ hiển thị ở modal riêng) */}
                    {showInlinePanel && (
                      <div className="mt-3 rounded-xl bg-[var(--panel2)] border border-[var(--border)] p-3.5 space-y-3 animate-in">
                        {newPassFor?.id === u.id && (
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Field label="Mật khẩu mới">
                                <PasswordInput value={newPassFor.password} onChange={(e) => setNewPassFor({ id: u.id, password: e.target.value })} placeholder="nhập mật khẩu mới" />
                              </Field>
                            </div>
                            <button onClick={saveNewPassword} className="btn-primary text-xs rounded-xl">Lưu</button>
                          </div>
                        )}
                        {resetTokenFor?.id === u.id && (
                          <div className="rounded-xl bg-[var(--panel)] border border-[#1b98e0]/40 p-3 space-y-2">
                            <div className="text-[11px] font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><RotateCcw size={13} className="text-[#1b98e0]" /> Mã đặt lại mật khẩu</span>
                              <span className="text-[10px] font-normal text-slate-400">hiệu lực {resetTokenFor.expires} phút • dùng 1 lần</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="flex-1 min-w-0 rounded-lg bg-[var(--bg-2)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] break-all text-[#1b98e0]">{resetTokenFor.token}</code>
                              <button onClick={() => copyToken(resetTokenFor.token)} className="btn-ghost text-[10px] px-2.5 py-1.5 rounded-lg" type="button">Sao chép</button>
                            </div>
                            <p className="text-[10px] text-slate-500">Chuyển mã này cho <strong>{u.name}</strong>. Họ dán mã tại trang <strong>Quên mật khẩu</strong> cùng email & mật khẩu mới.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-500">
                  Trang {safePage}/{totalPages} • {((safePage - 1) * pageSize + 1)}–{Math.min(safePage * pageSize, users.length)} / {users.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="btn-ghost text-[10px] px-2.5 py-1.5 rounded-lg disabled:opacity-40" type="button"><ChevronLeft size={13} /> Trước</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="btn-ghost text-[10px] px-2.5 py-1.5 rounded-lg disabled:opacity-40" type="button">Sau <ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal tạo tài khoản mới */}
        {showForm && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in"
            onClick={closeCreateForm}
          >
            <form
              onSubmit={createUser}
              className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-xl bg-[#1b98e0]/15 text-[#1b98e0] grid place-items-center shrink-0"><UserPlus size={16} /></span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">Tạo tài khoản nhân viên</div>
                    <div className="text-[11px] text-slate-400 truncate">Điền thông tin và phân quyền cho tài khoản mới</div>
                  </div>
                </div>
                <button onClick={closeCreateForm} className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Đóng">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Họ tên *"><input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" /></Field>
                  <Field label="Email *"><input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nhanvien@company.vn" /></Field>
                  <Field label="Chức vụ"><input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="VD: Chuyên viên Content" /></Field>
                  <Field label="Vai trò">
                    <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Mật khẩu *"><PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mật khẩu" /></Field>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--muted)] mb-3">* <b>Mật khẩu:</b> ≥8 ký tự, có ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt (vd: Admin@123).</div>
                  <div className="text-xs font-bold mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#1b98e0]" /> Quyền sử dụng chức năng
                  </div>
                  <PermissionsEditor
                    permList={permList}
                    selected={newPerms}
                    onToggleKey={(key) => setNewPerms((arr) => arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key])}
                    onToggleModule={(g) => {
                      const keys = groupKeys(g);
                      const allOn = keys.every((k) => newPerms.includes(k));
                      setNewPerms((arr) => allOn ? arr.filter((k) => !keys.includes(k)) : Array.from(new Set([...arr, ...keys])));
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)] shrink-0">
                <button type="button" onClick={closeCreateForm} className="btn-ghost text-xs rounded-xl">Huỷ</button>
                <button type="submit" className="btn-primary text-xs rounded-xl">Tạo tài khoản</button>
              </div>
            </form>
          </div>,
          document.body
        )}

        {/* Modal phân quyền — hiển thị lớn, dễ nhìn hơn panel thu gọn */}
        {editing && typeof document !== "undefined" && (() => {
          const activeUser = users.find((x) => x.id === editing.id) || editing;
          return createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in"
              onClick={() => setEditing(null)}
            >
              <div
                className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl grid place-items-center text-white text-sm font-black shrink-0 ${isAdmin(activeUser) ? "bg-gradient-to-br from-amber-400 to-orange-600" : "bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8]"}`}>
                      {activeUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">Phân quyền cho {activeUser.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{activeUser.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setEditing(null)} className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:bg-[var(--bg-2)] hover:text-slate-700 transition-colors" type="button" title="Đóng">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto">
                  <PermissionsEditor
                    permList={permList}
                    selected={permsOf(activeUser)}
                    onToggleKey={(key) => togglePerm(activeUser, key)}
                    onToggleModule={(g) => toggleModuleAll(activeUser, g)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--border)] shrink-0">
                  <span className="text-[11px] text-slate-400">Thay đổi được lưu ngay khi bạn bấm chọn.</span>
                  <button onClick={() => setEditing(null)} className="btn-primary text-xs rounded-xl" type="button">Xong</button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
      </div>
    );
  }
}