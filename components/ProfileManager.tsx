"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { Save, Mail, Phone, ShieldCheck, Hash, User, Youtube, Facebook, Instagram, Music2, Link2, Image as ImageIcon, Trash2 } from "./icons";

const BIO_LIMIT = 240;

export default function ProfileManager() {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sUser = session?.user as { role?: string } | undefined;

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.user) {
          setName(d.user.name || "");
          setEmail(d.user.email || "");
          setPhone(d.user.phone || "");
          setBio(d.user.bio || "");
          setJobTitle(d.user.jobTitle || "");
          setSocialYoutube(d.user.socialYoutube || "");
          setSocialTiktok(d.user.socialTiktok || "");
          setSocialFacebook(d.user.socialFacebook || "");
          setSocialInstagram(d.user.socialInstagram || "");
          setAvatarUrl(d.user.avatar || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const completeness = useMemo(() => {
    const fields = [name, email, phone, jobTitle, bio];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [name, email, phone, bio]);


  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setDirty(true);
      setter(v);
    };
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, jobTitle, bio, socialYoutube, socialTiktok, socialFacebook, socialInstagram }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu hồ sơ thất bại");
      toast.success("Đã lưu hồ sơ");
      setDirty(false);
      router.refresh();
    } catch (err: any) {
      toast.error("Không lưu được hồ sơ", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Tải ảnh thất bại");
      setAvatarUrl(d.url);
      toast.success("Đã cập nhật ảnh đại diện");
      window.dispatchEvent(new Event("profile:refresh"));
      router.refresh();
    } catch (err: any) {
      toast.error("Không tải được ảnh", err.message || String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Xoá ảnh thất bại");
      setAvatarUrl("");
      toast.success("Đã xoá ảnh đại diện");
      window.dispatchEvent(new Event("profile:refresh"));
      router.refresh();
    } catch (err: any) {
      toast.error("Không xoá được ảnh", err.message || String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="h-32 skeleton" />
          <div className="px-6 sm:px-10 pb-8 -mt-16 flex items-center gap-5">
            <div className="h-28 w-28 rounded-3xl skeleton shrink-0" />
            <div className="space-y-2 mt-16">
              <div className="h-5 w-40 rounded skeleton" />
              <div className="h-3 w-24 rounded skeleton" />
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="card p-6 h-64 skeleton" />
          <div className="card p-8 h-64 skeleton" />
        </div>
      </div>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="group flex items-start gap-3 rounded-xl -mx-2 px-2 py-1.5 transition-colors hover:bg-white/5">
      <span className="mt-0.5 text-[#1b98e0] grid place-items-center h-9 w-9 rounded-xl bg-[#1b98e0]/10 ring-1 ring-[#1b98e0]/15 shrink-0 transition-transform group-hover:scale-105">
        <Icon size={15} />
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-sm font-semibold break-words leading-snug">
          {value || <span className="text-slate-600 font-normal italic">Chưa cập nhật</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Banner + avatar */}
      <div className="card overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-[#1b98e0] via-[#1687c9] to-[#0f5f8f]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 60%, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>
        <div className="px-6 sm:px-10 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative shrink-0 -mt-16">
            <div className="h-28 w-28 rounded-3xl overflow-hidden grid place-items-center bg-gradient-to-br from-[#1b98e0] to-[#0f5f8f] text-white ring-4 ring-white shadow-xl">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
              ) : (
                <User size={40} />
              )}
            </div>
            <label className="absolute -bottom-1 -left-1 h-8 w-8 grid place-items-center rounded-full bg-[#1b98e0] ring-2 ring-white cursor-pointer hover:brightness-110 transition" title={avatarBusy ? "Đang tải..." : "Đổi ảnh đại diện"}>
              {avatarBusy ? <Spinner size={13} /> : <ImageIcon size={14} className="text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={avatarBusy} />
            </label>
            {avatarUrl && (
              <button onClick={removeAvatar} disabled={avatarBusy} className="absolute -bottom-1 left-9 h-8 w-8 grid place-items-center rounded-full bg-rose-500 ring-2 ring-white cursor-pointer hover:brightness-110 transition disabled:opacity-50" title="Xoá ảnh" type="button">
                <Trash2 size={14} className="text-white" />
              </button>
            )}
            <span className="absolute -top-1 -right-1 h-7 w-7 grid place-items-center rounded-full bg-emerald-500 ring-4 ring-white">
              <ShieldCheck size={12} className="text-white" />
            </span>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0 pt-3 sm:pt-0">
            <div className="text-2xl font-extrabold truncate">{name || "Chưa cập nhật"}</div>
            <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1b98e0]/10 text-[#1b98e0] ring-1 ring-[#1b98e0]/20">
                <ShieldCheck size={12} /> {jobTitle || sUser?.role || "Thành viên"}
              </span>
              {email && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail size={12} /> {email}
                </span>
              )}
            </div>
          </div>

          {/* Completeness */}
          <div className="w-full sm:w-40 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              <span>Hồ sơ</span>
              <span className="text-[#1b98e0]">{completeness}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1b98e0] to-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Cột tóm tắt */}
        <div className="card p-6 space-y-1">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0]" />
            Thông tin tài khoản
          </h3>
          <InfoRow icon={Mail} label="Email" value={email} />
          <InfoRow icon={Phone} label="Số điện thoại" value={phone} />
          <InfoRow icon={Hash} label="Họ tên" value={name} />
          {bio && (
            <div className="pt-3 mt-2 border-t border-white/5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Giới thiệu
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{bio}</p>
            </div>
          )}
          {(socialYoutube || socialTiktok || socialFacebook || socialInstagram) && (
            <div className="pt-3 mt-2 border-t border-[var(--border-soft)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Mạng xã hội
              </div>
              <div className="flex flex-wrap gap-2">
                {socialYoutube && (
                  <a href={socialYoutube} target="_blank" rel="noreferrer" title="YouTube" className="grid place-items-center h-9 w-9 rounded-xl bg-[#ff0000]/10 text-[#ff0000] ring-1 ring-[#ff0000]/15 hover:scale-105 transition">
                    <Youtube size={16} />
                  </a>
                )}
                {socialTiktok && (
                  <a href={socialTiktok} target="_blank" rel="noreferrer" title="TikTok" className="grid place-items-center h-9 w-9 rounded-xl bg-[var(--panel2)] text-slate-300 ring-1 ring-[var(--border)] hover:scale-105 transition">
                    <Music2 size={16} />
                  </a>
                )}
                {socialFacebook && (
                  <a href={socialFacebook} target="_blank" rel="noreferrer" title="Facebook" className="grid place-items-center h-9 w-9 rounded-xl bg-[#1877f2]/10 text-[#1877f2] ring-1 ring-[#1877f2]/15 hover:scale-105 transition">
                    <Facebook size={16} />
                  </a>
                )}
                {socialInstagram && (
                  <a href={socialInstagram} target="_blank" rel="noreferrer" title="Instagram" className="grid place-items-center h-9 w-9 rounded-xl bg-[#e1306c]/10 text-[#e1306c] ring-1 ring-[#e1306c]/15 hover:scale-105 transition">
                    <Instagram size={16} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form chỉnh sửa */}
        <form onSubmit={saveProfile} className="card p-6 sm:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold">Chỉnh sửa hồ sơ</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Cập nhật thông tin hiển thị của tài khoản
              </p>
            </div>
            {dirty && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20 px-2 py-1 rounded-full shrink-0">
                Chưa lưu
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Họ tên *">
              <input
                required
                className="input !py-2.5"
                value={name}
                onChange={(e) => markDirty(setName)(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </Field>
            <Field label="SĐT">
              <input
                className="input !py-2.5"
                value={phone}
                onChange={(e) => markDirty(setPhone)(e.target.value)}
                placeholder="0901 234 567"
              />
            </Field>
          </div>

          <Field label="Chức vụ">
            <input
              className="input !py-2.5"
              value={jobTitle}
              onChange={(e) => markDirty(setJobTitle)(e.target.value)}
              placeholder="VD: Chuyên viên Content Marketing"
            />
          </Field>

          <Field label="Bio / Giới thiệu">
            <div className="relative">
              <textarea
                rows={4}
                maxLength={BIO_LIMIT}
                className="input !py-2.5 resize-none"
                value={bio}
                onChange={(e) => markDirty(setBio)(e.target.value)}
                placeholder="Vài dòng giới thiệu về bạn"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-slate-500">
                {bio.length}/{BIO_LIMIT}
              </span>
            </div>
          </Field>

          {/* ── Mạng xã hội ───────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 pt-1">
              <Link2 size={13} className="text-[#1b98e0]" /> Mạng xã hội
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="YouTube">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff0000] pointer-events-none"><Youtube size={15} /></span>
                  <input type="url" className="input !py-2.5 !pl-9" value={socialYoutube} onChange={(e) => markDirty(setSocialYoutube)(e.target.value)} placeholder="https://youtube.com/@..." />
                </div>
              </Field>
              <Field label="TikTok">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Music2 size={15} /></span>
                  <input type="url" className="input !py-2.5 !pl-9" value={socialTiktok} onChange={(e) => markDirty(setSocialTiktok)(e.target.value)} placeholder="https://tiktok.com/@..." />
                </div>
              </Field>
              <Field label="Facebook">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1877f2] pointer-events-none"><Facebook size={15} /></span>
                  <input type="url" className="input !py-2.5 !pl-9" value={socialFacebook} onChange={(e) => markDirty(setSocialFacebook)(e.target.value)} placeholder="https://facebook.com/..." />
                </div>
              </Field>
              <Field label="Instagram">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e1306c] pointer-events-none"><Instagram size={15} /></span>
                  <input type="url" className="input !py-2.5 !pl-9" value={socialInstagram} onChange={(e) => markDirty(setSocialInstagram)(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !dirty}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? <Spinner /> : <Save size={15} />} {saving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </form>
      </div>
    </div>
  );
}