import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { readFileStored } from "@/lib/storage";

/** User đại diện cho "Hệ thống" — thông báo CHUNG hiển thị cho tất cả mọi người */
const BROADCAST_EMAIL = "system@company.vn";

/** GET — tải file Word/PDF đính kèm thông báo (chung: mọi người đăng nhập; riêng: của mình/admin) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const notif = await prisma.notification.findUnique({ where: { id: Number(params.id) } });
  if (!notif || !notif.filePath || !notif.fileName) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy file đính kèm" }, { status: 404 });
  }

  // Quyền xem file: thông báo chung (Hệ thống), hoặc thông báo riêng của chính user, hoặc admin
  const broadcastUser = await prisma.user.findUnique({ where: { email: BROADCAST_EMAIL }, select: { id: true } });
  const isGeneral = broadcastUser ? notif.userId === broadcastUser.id : false;
  const admin = !!user && (isAdminLike(user) || canAccess(user, "users"));
  if (!isGeneral && notif.userId !== me && !admin) {
    return NextResponse.json({ ok: false, error: "Không có quyền tải file" }, { status: 403 });
  }

  // Đọc từ DATABASE (bền vững qua deploy) → fallback ổ đĩa cho file cũ
  const data = await readFileStored(notif.filePath);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không đọc được file" }, { status: 404 });
  }
  const ext = (notif.fileName.split(".").pop() || "docx");
  const dlName = notif.fileName.replace(/[\\/:*?"<>|]/g, "_");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="notif_${notif.id}.${ext}"; filename*=UTF-8''${encodeURIComponent(dlName)}`,
    },
  });
}
