"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Field, Spinner } from "./ui";
import { KeyRound, ShieldCheck } from "./icons";
import PasswordInput from "./PasswordInput";
import { validatePassword, PASSWORD_RULE } from "@/lib/passwordPolicy";

function getStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Yếu", color: "bg-rose-500" };
  if (score <= 2) return { score: 2, label: "Trung bình", color: "bg-amber-500" };
  if (score <= 4) return { score: 3, label: "Khá tốt", color: "bg-[#1b98e0]" };
  return { score: 4, label: "Mạnh", color: "bg-emerald-500" };
}

export default function ChangePasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [passCur, setPassCur] = useState("");
  const [passNew, setPassNew] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const newPassCheck = useMemo(() => {
    if (!passNew) return null;
    return validatePassword(passNew);
  }, [passNew]);

  const strength = useMemo(() => getStrength(passNew), [passNew]);
  const confirmMismatch = passConfirm.length > 0 && passConfirm !== passNew;

  const canSubmit =
    passCur.length > 0 &&
    passNew.length > 0 &&
    passConfirm.length > 0 &&
    !confirmMismatch &&
    (newPassCheck?.ok ?? false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passCur || !passNew) {
      toast.error("Thiếu thông tin", "Nhập mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (passNew !== passConfirm) {
      toast.error("Mật khẩu không khớp", "Xác nhận mật khẩu mới không trùng khớp.");
      return;
    }
    const v = validatePassword(passNew);
    if (!v.ok) {
      toast.error("Mật khẩu không đạt chuẩn", v.message);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passCur, newPassword: passNew }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");
      toast.success("Đã đổi mật khẩu", "Lần đăng nhập tới dùng mật khẩu mới.");
      setPassCur("");
      setPassNew("");
      setPassConfirm("");
      router.refresh();
    } catch (err: any) {
      toast.error("Đổi mật khẩu thất bại", err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  const NoticeRow = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3 rounded-xl -mx-2 px-2 py-1.5 transition-colors hover:bg-white/5">
      <span className="mt-0.5 text-[#1b98e0] grid place-items-center h-7 w-7 rounded-lg bg-[#1b98e0]/10 ring-1 ring-[#1b98e0]/15 shrink-0">
        <ShieldCheck size={12} />
      </span>
      <span className="text-xs text-[var(--muted)] leading-relaxed pt-1">{children}</span>
    </li>
  );

  return (
    <div className="space-y-6">
      {/* Banner + icon tile */}
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
            <div className="h-28 w-28 rounded-3xl grid place-items-center bg-gradient-to-br from-[#1b98e0] to-[#0f5f8f] text-white ring-4 ring-white shadow-xl">
              <KeyRound size={40} />
            </div>
            <span className="absolute -bottom-1 -right-1 h-7 w-7 grid place-items-center rounded-full bg-emerald-500 ring-4 ring-white">
              <ShieldCheck size={12} className="text-white" />
            </span>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0 pt-3 sm:pt-0">
            <div className="text-2xl font-extrabold">Quản lý mật khẩu</div>
            <p className="text-sm text-slate-400 mt-1">Bảo vệ tài khoản của bạn bằng mật khẩu mạnh</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Lưu ý */}
        <div className="card p-6 space-y-1">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1b98e0]" />
            Lưu ý bảo mật
          </h3>
          <ul className="space-y-1">
            <NoticeRow>
              Mật khẩu mới: <b className="text-slate-200 font-semibold">{PASSWORD_RULE}</b>
            </NoticeRow>
            <NoticeRow>Sau khi đổi, lần đăng nhập sau bạn dùng mật khẩu mới.</NoticeRow>
            <NoticeRow>Không chia sẻ mật khẩu cho người khác.</NoticeRow>
            <NoticeRow>
              Nếu quên mật khẩu, liên hệ Admin để lấy lại mật khẩu.
            </NoticeRow>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={changePassword} className="card p-6 sm:p-8 space-y-5 max-w-2xl">
          <div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <KeyRound size={18} className="text-[#1b98e0]" /> Đổi mật khẩu
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">Dùng mật khẩu hiện tại để xác nhận</p>
          </div>

          <Field label="Mật khẩu hiện tại">
            <PasswordInput
              required
              inputClassName="!py-2.5"
              value={passCur}
              onChange={(e) => setPassCur(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </Field>

          <Field label="Mật khẩu mới">
            <PasswordInput
              required
              inputClassName="!py-2.5"
              value={passNew}
              onChange={(e) => setPassNew(e.target.value)}
              placeholder="Nhập mật khẩu mới"
            />

            {passNew && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                          i < strength.score ? strength.color : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                    {strength.label}
                  </span>
                </div>

                <div
                  className={`flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-2 ${
                    newPassCheck?.ok
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 font-bold">{newPassCheck?.ok ? "✓" : "!"}</span>
                  <span>{newPassCheck?.ok ? "Mật khẩu hợp lệ." : newPassCheck?.message || PASSWORD_RULE}</span>
                </div>
              </div>
            )}
          </Field>

          <Field label="Xác nhận mật khẩu mới">
            <PasswordInput
              required
              inputClassName="!py-2.5"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
            {confirmMismatch && (
              <p className="mt-1.5 text-xs text-rose-400">Mật khẩu xác nhận không khớp.</p>
            )}
          </Field>

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="btn-primary w-full justify-center py-3 text-sm sm:w-auto sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? <Spinner /> : <KeyRound size={15} />} {saving ? "Đang đổi..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}