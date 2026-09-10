import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isAdminLike, PERMISSION_GROUPS } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/passwordPolicy";
import { logActivity } from "@/lib/activity";

const SELECT = {
  id: true, name: true, email: true, role: true, jobTitle: true, permissions: true, active: true, avatar: true, createdAt: true,
} as const;

async function isAdmin() {
  const u = await getCurrentUser();
  return !!u && isAdminLike(u);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 403 });
  }
  // Ẩn tài khoản kỹ thuật "Hệ thống" (dùng nội bộ cho thông báo chung)
  const users = await prisma.user.findMany({
    where: { email: { not: "system@company.vn" } },
    orderBy: { id: "asc" },
    select: SELECT,
  });
  return NextResponse.json({ ok: true, users, permissionList: PERMISSION_GROUPS });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, email, role, password, active, permissions } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập tên, email và mật khẩu" }, { status: 400 });
    }
    const pwv = validatePassword(String(password));
    if (!pwv.ok) {
      return NextResponse.json({ ok: false, error: pwv.message }, { status: 400 });
    }
    const mail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: mail } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Email đã tồn tại" }, { status: 400 });
    }
    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: mail,
        jobTitle: body.jobTitle ? String(body.jobTitle).trim().slice(0, 100) : null,
        role: role || "Marketing",
        passwordHash: hashPassword(String(password)),
        active: active !== false,
        permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
      },
      select: SELECT,
    });
    await logActivity("users", "create", `Tạo tài khoản "${user.name}" (${user.email} - ${user.role})`);
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, name, role, active, password, permissions } = body;
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

    const data: any = {};
    if (name !== undefined) data.name = String(name);
    if (role !== undefined) data.role = String(role);
    if (active !== undefined) data.active = Boolean(active);
    if (permissions !== undefined) data.permissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    if (password) {
      const pwv = validatePassword(String(password));
      if (!pwv.ok) {
        return NextResponse.json({ ok: false, error: pwv.message }, { status: 400 });
      }
      data.passwordHash = hashPassword(String(password));
    }

    const user = await prisma.user.update({ where: { id: Number(id) }, data, select: SELECT });
    await logActivity("users", "update", `Cập nhật tài khoản "${user.name}" (#${id}, role ${user.role})`);
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
    const me = await getCurrentUser();
    if (id === Number(me?.id)) {
      return NextResponse.json({ ok: false, error: "Không thể xoá tài khoản của chính mình" }, { status: 400 });
    }
    const item = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
    if (item?.email === "system@company.vn") {
      return NextResponse.json({ ok: false, error: "Tài khoản Hệ thống là tài khoản kỹ thuật của thông báo chung — không thể xoá" }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });
    await logActivity("users", "delete", `Xoá tài khoản "${item?.name || `#${id}`}" (${item?.email || ""})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}