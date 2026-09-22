import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { readFileStored, deleteStoredFile } from "@/lib/storage";

async function canManage(user: any, report: any, action: string) {
  if (!user) return false;
  if (canAccess(user, "users") || isAdminLike(user)) return true;
  const isOwner = Number(report.employeeId) === Number(user.id);
  return isOwner && canAccess(user, `reports_work_${action}`);
}

/** Tải file báo cáo về (admin hoặc chính nhân viên). File đọc từ DATABASE. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const report = await prisma.report.findUnique({
    where: { id: Number(params.id) },
    include: { employee: { select: { name: true } } },
  });
  if (!report || !report.filePath) return NextResponse.json({ ok: false, error: "Không có file" }, { status: 404 });
  if (!(await canManage(user, report, "download"))) return NextResponse.json({ ok: false, error: "Không có quyền tải về" }, { status: 403 });

  const data = await readFileStored(report.filePath);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không đọc được file" }, { status: 404 });
  }
  const ext = (report.fileName?.split(".").pop() || "docx");
  // Tên file = "Tiêu đề - Tên nhân viên.docx" để dễ phân biệt khi tải về
  const safeTitle = (report.title || `report_${report.id}`).replace(/[\\/:*?"<>|]/g, "_").trim();
  const safeEmp = (report.employee?.name || "NhanVien").replace(/[\\/:*?"<>|]/g, "_").trim();
  const dlName = `${safeTitle} - ${safeEmp}.${ext}`;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="report_${report.id}.${ext}"; filename*=UTF-8''${encodeURIComponent(dlName)}`,
    },
  });
}

/** Xoá file đã nộp (nhân viên xoá nếu tải nhầm / admin xoá) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: Number(params.id) } });
  if (!report) return NextResponse.json({ ok: false, error: "Không tìm thấy báo cáo" }, { status: 404 });
  if (!report.filePath) return NextResponse.json({ ok: false, error: "Chưa nộp file" }, { status: 400 });
  if (!(await canManage(user, report, "delete"))) return NextResponse.json({ ok: false, error: "Không có quyền xoá file" }, { status: 403 });

  await deleteStoredFile(report.filePath);

  await prisma.report.update({
    where: { id: Number(params.id) },
    data: { fileName: null, filePath: null, status: "Chưa nộp", submittedAt: null },
  });

  return NextResponse.json({ ok: true });
}