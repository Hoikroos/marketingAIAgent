import Link from "next/link";
import { ShieldAlert } from "@/components/icons";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[var(--bg)]">
      <div className="card p-10 max-w-md w-full text-center animate-in">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/15 text-rose-300 grid place-items-center mx-auto mb-4">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-xl font-black">Không có quyền truy cập</h1>
        <p className="text-sm text-slate-400 mt-2">
          Tài khoản của bạn chưa được cấp quyền dùng chức năng này.
          Hãy liên hệ quản trị viên để được cấp quyền.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 justify-center">
          Về Dashboard
        </Link>
      </div>
    </main>
  );
}