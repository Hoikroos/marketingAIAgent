"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";
import { Building2 } from "@/components/icons";
import { useBrand } from "@/components/BrandProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { companyName, companyPhone, companyEmail } = useBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Khi NextAuth điều hướng lại /login kèm ?error= (sai mật khẩu...) → báo lỗi 1 lần.
  // Dùng ref để StrictMode (mount 2 lần trong dev) không làm toast hiện 2 lần.
  const shownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const err = searchParams.get("error");
    if (err && shownErrorRef.current !== err) {
      shownErrorRef.current = err;
      toast.error("Đăng nhập thất bại", "Sai email hoặc mật khẩu, hoặc tài khoản bị khoá.");
    }
  }, [searchParams, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Kiểm tra trước: tài khoản này có đang bị khóa tạm thời không
      const lr = await fetch("/api/auth/lock-status?email=" + encodeURIComponent(email)).then((r) => r.json());
      if (lr?.locked) {
        toast.error(
          "Đã bị khóa tạm thời",
          `Bạn đã nhập sai quá nhiều lần. Vui lòng đợi ${Math.ceil(
            lr.retryAfterSec / 60
          )} phút rồi thử lại.`
        );
        setLoading(false);
        return;
      }
      const cb = searchParams.get("callbackUrl");
      // redirect:true → NextAuth tự chuyển hướng sau khi cookie đã lưu → vào 1 lần là được
      const res = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: cb && cb.startsWith("/") ? cb : "/dashboard",
      });
      // redirect:true thành công sẽ điều hướng sang dashboard; khi lỗi NextAuth tự quay
      // lại /login?error=... và useEffect ở trên hiển thị → không cần toast ở đây nữa
      // (tránh hiện double).
      if (res && res.error) {
        setLoading(false);
      }
    } catch {
      setLoading(false);
      toast.error("Đăng nhập thất bại", "Có lỗi khi đăng nhập, xin thử lại.");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1b98e0] to-[#0f6ea8] grid place-items-center text-white shadow-lg mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight">{companyName}</h1>
          <p className="text-xs text-slate-400 mt-1">Đăng nhập để sử dụng hệ thống marketing</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4 animate-in">
          <label className="block">
            <span className="field-label">Email</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.vn"
              className="input"
            />
          </label>
          <label className="block">
            <span className="field-label">Mật khẩu</span>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading && <Spinner />} {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <Link href="/forgot-password" className="block text-center text-[11px] text-[#1b98e0] hover:underline mt-4">
          Quên mật khẩu?
        </Link>
        {(companyPhone || companyEmail) && (
          <p className="text-[10px] text-slate-500 text-center mt-4">
            {companyPhone && <>📞 {companyPhone}</>}
            {companyPhone && companyEmail && "  ·  "}
            {companyEmail && <>✉️ {companyEmail}</>}
          </p>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
            <span className="text-sm text-white animate-pulse">Đang đăng nhập...</span>
          </div>
        </div>
      )}
    </main>
  );
}