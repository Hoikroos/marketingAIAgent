import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { saveFile } from "@/lib/storage";

const ALLOWED = ["doc", "docx", "pdf"];
const MAX_BYTES = 20 * 1024 * 1024;

/** POST — sếp/admin tải lên file Word/PDF đính kèm thông báo chung (lưu vào DATABASE) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const isAdmin = !!user && (isAdminLike(user) || canAccess(user, "users"));
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Không có quyền gửi thông báo chung" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Chưa chọn file" }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ ok: false, error: "Chỉ chấp nhận file Word (.doc/.docx) hoặc PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File tối đa 20MB" }, { status: 400 });
  }

  const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  if (!(await saveFile(`notifications/${safe}`, buf))) {
    return NextResponse.json({ ok: false, error: "Không lưu được file" }, { status: 500 });
  }
  // Giữ nguyên định dạng filePath cũ ("uploads/notifications/<tên>") để tương thích ngược
  const rel = `uploads/notifications/${safe}`;

  return NextResponse.json({ ok: true, fileName: file.name, filePath: rel });
}
