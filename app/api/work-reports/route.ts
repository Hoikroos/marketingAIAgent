import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";

function isAdminUser(user: any) {
  return !!user && (canAccess(user, "users") || isAdminLike(user) || canAccess(user, "reports_work_create"));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const admin = isAdminUser(user);
  const reports = admin
    ? await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { id: true, name: true, avatar: true } } },
      })
    : await prisma.report.findMany({
        where: { employeeId: Number(user.id) },
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { id: true, name: true, avatar: true } } },
      });

  const employees = admin
    ? await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, avatar: true } })
    : [];

  return NextResponse.json({ ok: true, reports, employees, isAdmin: admin });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: "Không có quyền tạo báo cáo" }, { status: 403 });

  try {
    const body = await req.json();
    const { title, period, periodLabel, employeeIds } = body;
    if (!title || !period || !periodLabel || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Nhập đầy đủ tiêu đề, kỳ và chọn nhân viên" }, { status: 400 });
    }
    if (!["week", "month"].includes(period)) {
      return NextResponse.json({ ok: false, error: "Kỳ phải là week hoặc month" }, { status: 400 });
    }
    const uids = [...new Set(employeeIds.map(Number).filter((n) => n > 0))];
    let count = 0;
    for (const uid of uids) {
      const createdReport = await prisma.report.create({
        data: {
          title: String(title),
          period: String(period),
          periodLabel: String(periodLabel),
          employeeId: uid,
          createdById: Number(user.id),
        },
      });
      // Thông báo cho nhân viên vừa được giao báo cáo
      try {
        await prisma.notification.create({
          data: {
            userId: uid,
            type: "report",
            title: "Bạn được giao báo cáo công việc",
            content: `${String(title)} (${String(periodLabel)})`,
            refId: createdReport.id,
          },
        });
      } catch {}
      count++;
    }
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}