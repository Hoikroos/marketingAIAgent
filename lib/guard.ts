import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { canAccess, isAdminLike } from "./permissions";

/** Bắt buộc đã đăng nhập; nếu chưa → chuyển về /login */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Bắt buộc có quyền tương ứng chức năng {key}; nếu không → /forbidden */
export async function requirePerm(key: string) {
  const user = await requireUser();
  if (!canAccess(user, key)) redirect("/forbidden");
  return user;
}

/**
 * Bắt buộc là ADMIN THẬT SỰ (role "Admin" hoặc sở hữu quyền "*").
 * Kể cả người dùng khác được cấp quyền liên quan cũng bị chặn → /forbidden.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminLike(user)) redirect("/forbidden");
  return user;
}

/**
 * Phiên bản dành cho route handler (API): buộc là ADMIN THẬT SỰ.
 * Trả về NextResponse 403 nếu không phải admin (để handler trả về luôn).
 */
export async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (!isAdminLike(user)) {
    return NextResponse.json({ ok: false, error: "Chỉ Admin mới được thực hiện" }, { status: 403 });
  }
  return null;
}

export async function requirePermApi(key: string): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (!canAccess(user, key)) {
    return NextResponse.json({ ok: false, error: "Không có quyền thực hiện thao tác này" }, { status: 403 });
  }
  return null;
}

/** Lấy user đã đăng nhập (dùng trong route handler) */
export async function getApiUser() {
  return await getCurrentUser();
}