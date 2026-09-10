"use client";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/permissions";

/** Kiểm tra quyền của người dùng hiện tại (phía client). VD: usePerm("content_studio_create") */
export default function usePerm(key?: string): boolean {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; permissions?: string } | undefined;
  return !!key && canAccess(user ?? null, key);
}
