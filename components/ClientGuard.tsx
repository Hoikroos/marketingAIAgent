"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canAccess, isAdminLike } from "@/lib/permissions";

/**
 * Chặn phía client cho những trang "use client" theo quyền.
 * Nếu chưa đăng nhập → về /login; nếu thiếu quyền → /forbidden.
 * Nếu `adminOnly = true` thì chỉ ADMIN thật sự (role Admin / quyền "*") mới vào được.
 */
export default function ClientGuard({
  perm,
  adminOnly = false,
  children,
}: {
  perm: string;
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as
    | { role?: string; permissions?: string }
    | undefined;

  const allowed = !!user && (adminOnly ? isAdminLike(user) : canAccess(user, perm));

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !allowed)
      router.replace("/forbidden");
  }, [status, allowed, router]);

  if (status === "loading") {
    return (
      <div className="text-xs text-slate-400 py-10 text-center">
        Đang kiểm tra quyền...
      </div>
    );
  }
  if (status !== "authenticated" || !allowed) {
    return <div className="text-xs text-slate-400 py-10 text-center">Đang kiểm tra quyền...</div>;
  }
  return <>{children}</>;
}