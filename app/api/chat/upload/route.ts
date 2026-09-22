import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/** POST — upload ảnh để gửi trong chat (lưu vào DATABASE, bền vững qua deploy/restart) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ ok: false, error: "Chưa chọn ảnh" }, { status: 400 });
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ ok: false, error: "Chỉ chấp nhận PNG/JPG/GIF/WEBP" }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Ảnh tối đa 10MB" }, { status: 400 });

  const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await f.arrayBuffer());
  if (!(await saveFile(`chat/${safe}`, buf))) {
    return NextResponse.json({ ok: false, error: "Không lưu được ảnh" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: `/api/files/chat/${safe}` });
}
