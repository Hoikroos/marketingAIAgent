"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";
import { Building2, KeyRound, ArrowLeft } from "@/components/icons";
import { useBrand } from "@/components/BrandProvider";
import { validatePassword } from "@/lib/passwordPolicy";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotInner />
    </Suspense>
  );
}

function ForgotInner() {
  const router = useRouter();
  const toast = useToast();
  const { companyName } = useBrand();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Mật khẩu không khớp", "Vui lòng nhập lại hai ô mật khẩu giống nhau.");
      return;
    }
    const v = validatePassword(password);
    if (!v.ok) {
      toast.error("Mật khẩu không đạt chuẩn", v.message);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: token.trim(), newPassword: password, confirm }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Đặt lại mật khẩu thất bại");
      toast.success("Đã đặt lại mật khẩu", "Bạn có thể đăng nhập bằng mật khẩu mới.");
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      toast.error("Đặt lại mật khẩu thất bại", err.message || "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8] grid place-items-center text-white shadow-lg mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight">Quên mật khẩu</h1>
          <p className="text-xs text-slate-400 mt-1">Nhập mật khẩu mới bằng mã đặt lại do Admin cấp</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4 animate-in">
          <label className="block">
            <span className="field-label">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.vn" className="input" />
          </label>
          <label className="block">
            <span className="field-label">Mã đặt lại (do Admin cấp)</span>
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-slate-400" />
              <input type="text" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="dán mã đặt lại" className="input" />
            </div>
          </label>
          <label className="block">
            <span className="field-label">Mật khẩu mới</span>
            <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <label className="block">
            <span className="field-label">Xác nhận mật khẩu mới</span>
            <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading && <Spinner />} {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 mt-4">
          {!email && (
            <p className="text-[10px] text-slate-500 text-center">
              Chưa có mã đặt lại? Hãy nhờ <strong>Admin</strong> tạo mã (trong trang Quản lý tài khoản
              &gt; Đổi mật khẩu &gt; Tạo mã đặt lại).
            </p>
          )}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[11px] text-[#1b98e0] hover:underline">
            <ArrowLeft size={13} /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}