import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";

async function canViewAll(user: any): Promise<boolean> {
  return !!user && (canAccess(user, "users") || isAdminLike(user) || canAccess(user, "dailyreports_viewall"));
}

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const all = await canViewAll(u);
    const uid = Number(u.id);
    const rows: any[] = all
      ? await prisma.$queryRaw`SELECT id, "userId", "userName", date, "tasksDone", note, "updatedAt" FROM "DailyReport" ORDER BY date DESC, id DESC`
      : await prisma.$queryRaw`SELECT id, "userId", "userName", date, "tasksDone", note, "updatedAt" FROM "DailyReport" WHERE "userId" = ${uid} ORDER BY date DESC, id DESC`;
    return NextResponse.json({ ok: true, reports: rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const body = await req.json();
    const date = String(body.date || "").trim();
    const tasksDone = String(body.tasksDone || "").trim();
    if (!date || !tasksDone) return NextResponse.json({ ok: false, error: "Thiếu ngày hoặc nội dung công việc" }, { status: 400 });
    const note = body.note ? String(body.note) : null;
    const uid = Number(u.id);
    const uname = String(u.name || "Nhân viên");

    const existing: any[] = await prisma.$queryRaw`SELECT id FROM "DailyReport" WHERE "userId" = ${uid} AND date = ${date}`;
    if (existing[0]) {
      await prisma.$executeRaw`UPDATE "DailyReport" SET "tasksDone" = ${tasksDone}, note = ${note}, "updatedAt" = ${new Date()} WHERE id = ${Number(existing[0].id)}`;
    } else {
      await prisma.$executeRaw`INSERT INTO "DailyReport" ("userId","userName",date,"tasksDone",note,"createdAt","updatedAt") VALUES (${uid},${uname},${date},${tasksDone},${note},${new Date()},${new Date()})`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id || body.tasksDone === undefined) return NextResponse.json({ ok: false, error: "Thiếu id hoặc nội dung" }, { status: 400 });
    const rows: any[] = await prisma.$queryRaw`SELECT "userId" FROM "DailyReport" WHERE id = ${id}`;
    if (!rows[0]) return NextResponse.json({ ok: false, error: "Không tìm thấy báo cáo" }, { status: 404 });
    if (Number(rows[0].userId) !== Number(u.id)) {
      return NextResponse.json({ ok: false, error: "Chỉ bạn mới được sửa báo cáo của mình" }, { status: 403 });
    }
    await prisma.$executeRaw`UPDATE "DailyReport" SET "tasksDone" = ${String(body.tasksDone)}, note = ${body.note ? String(body.note) : null}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
    const rows: any[] = await prisma.$queryRaw`SELECT "userId" FROM "DailyReport" WHERE id = ${id}`;
    if (!rows[0]) return NextResponse.json({ ok: false, error: "Không tìm thấy báo cáo" }, { status: 404 });
    if (Number(rows[0].userId) !== Number(u.id)) {
      return NextResponse.json({ ok: false, error: "Chỉ bạn mới được xoá báo cáo của mình" }, { status: 403 });
    }
    await prisma.$executeRaw`DELETE FROM "DailyReport" WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
