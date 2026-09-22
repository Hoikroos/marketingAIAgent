import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import path from "path";
import { saveFile, deleteStoredFile } from "@/lib/storage";
import { safeName } from "@/lib/reports";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const id = Number(params.id);
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ ok: false, error: "Không tìm thấy báo cáo" }, { status: 404 });

  const isAdmin = !!user && (canAccess(user, "users") || isAdminLike(user));
  const isOwner = Number(report.employeeId) === Number(user.id);
  // Cần quyền "tải lên" (Nộp file) và là chủ sở hữu (hoặc admin)
  const hasUpload = !!user && canAccess(user, "reports_work_upload");
  if (!isAdmin && !(isOwner && hasUpload)) {
    return NextResponse.json({ ok: false, error: "Không có quyền nộp file" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file) return NextResponse.json({ ok: false, error: "Chưa chọn file" }, { status: 400 });

  const f = file as File;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!["doc", "docx", "pdf"].includes(ext)) {
    return NextResponse.json({ ok: false, error: "Chỉ chấp nhận file Word (.doc/.docx) hoặc PDF" }, { status: 400 });
  }

  const buf = Buffer.from(await f.arrayBuffer());
  const safe = `${Date.now()}_${id}_${safeName(f.name)}`;

  // Xoá file cũ (nếu nộp lại)
  if (report.filePath) {
    await deleteStoredFile(report.filePath);
  }

  // Lưu vào DATABASE (bền vững qua deploy/restart trên Render)
  if (!(await saveFile(`reports/${safe}`, buf))) {
    return NextResponse.json({ ok: false, error: "Không lưu được file" }, { status: 500 });
  }
  // Giữ nguyên định dạng filePath cũ ("uploads/reports/<tên>") để tương thích ngược
  const rel = `uploads/reports/${path.posix.basename(safe)}`;

  await prisma.report.update({
    where: { id },
    data: { fileName: f.name, filePath: rel, status: "Đã nộp", submittedAt: new Date() },
  });

  // Thông báo cho admin (người đã giao báo cáo) rằng nhân viên vừa nộp
  try {
    const emp = report.employeeId
      ? await prisma.user.findUnique({ where: { id: report.employeeId }, select: { name: true } })
      : null;
    if (report.createdById) {
      await prisma.notification.create({
        data: {
          userId: Number(report.createdById),
          type: "report",
          title: `${emp?.name || "Nhân viên"} vừa nộp báo cáo`,
          content: `${report.title} (${report.periodLabel})`,
          refId: Number(id),
        },
      });
    }
  } catch {}

  return NextResponse.json({ ok: true });
}