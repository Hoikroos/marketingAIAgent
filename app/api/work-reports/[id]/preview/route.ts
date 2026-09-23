import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { readFileStored } from "@/lib/storage";
import { extractDocxParagraphs } from "@/lib/docx";

async function canView(user: any, report: any) {
  if (!user) return false;
  if (canAccess(user, "users") || isAdminLike(user)) return true;
  const isOwner = Number(report.employeeId) === Number(user.id);
  return isOwner && canAccess(user, "reports_work_download");
}

/** Xem trước nội dung file báo cáo (admin hoặc chính nhân viên, cần quyền download) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: Number(params.id) } });
  if (!report || !report.filePath) return NextResponse.json({ ok: false, error: "Không có file" }, { status: 404 });
  if (!(await canView(user, report))) return NextResponse.json({ ok: false, error: "Không có quyền xem" }, { status: 403 });

  // Đọc từ DATABASE (bền vững qua deploy) → fallback ổ đĩa cho file cũ
  const data = await readFileStored(report.filePath);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không đọc được file" }, { status: 404 });
  }

  const ext = (report.fileName?.split(".").pop() || "").toLowerCase();

  if (ext === "docx") {
    const paragraphs = extractDocxParagraphs(data);
    if (paragraphs.length) return NextResponse.json({ ok: true, paragraphs, fileName: report.fileName, ext });
    return NextResponse.json({ ok: true, paragraphs: null, message: "Không trích xuất được văn bản từ file .docx này (có thể bị hỏng hoặc định dạng bất thường). Hãy dùng nút Tải về." });
  }

  if (ext === "txt" || ext === "md" || ext === "csv") {
    const paragraphs = data
      .toString("utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return NextResponse.json({ ok: true, paragraphs, fileName: report.fileName, ext });
  }

  return NextResponse.json({
    ok: true,
    paragraphs: null,
    message: `Định dạng .${ext || "file"} không hiển thị được nội dung trong trình duyệt. Hãy dùng nút Tải về để mở bằng ứng dụng phù hợp.`,
  });
}
