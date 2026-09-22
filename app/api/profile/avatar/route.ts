import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveFile, deleteStoredFile } from "@/lib/storage";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Lấy đường dẫn tương đối (vd "avatars/avatar_x.jpg") từ URL "/api/files/avatars/avatar_x.jpg" */
function relFromUrl(url: string): string | null {
  const m = url.match(/\/api\/files\/(.+)$/);
  return m ? m[1] : null;
}

/** POST — tải ảnh đại diện lên (lưu vào DATABASE, bền vững qua deploy/restart) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ ok: false, error: "Chưa chọn ảnh" }, { status: 400 });
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ ok: false, error: "Chỉ chấp nhận PNG/JPG/GIF/WEBP" }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Ảnh tối đa 5MB" }, { status: 400 });

  // Xoá avatar cũ (nếu có) — khỏi DB và ổ đĩa (file cũ)
  const cur = await prisma.user.findUnique({ where: { id: me }, select: { avatar: true } });
  if (cur?.avatar) {
    const oldRel = relFromUrl(cur.avatar);
    if (oldRel) await deleteStoredFile(oldRel);
  }

  const safe = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await f.arrayBuffer());
  if (!(await saveFile(`avatars/${safe}`, buf))) {
    return NextResponse.json({ ok: false, error: "Không lưu được ảnh" }, { status: 500 });
  }
  const url = `/api/files/avatars/${safe}`;

  await prisma.user.update({ where: { id: me }, data: { avatar: url } });
  return NextResponse.json({ ok: true, url });
}

/** DELETE — xoá ảnh đại diện */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const cur = await prisma.user.findUnique({ where: { id: me }, select: { avatar: true } });
  if (cur?.avatar) {
    const oldRel = relFromUrl(cur.avatar);
    if (oldRel) await deleteStoredFile(oldRel);
  }
  await prisma.user.update({ where: { id: me }, data: { avatar: null } });
  return NextResponse.json({ ok: true });
}
