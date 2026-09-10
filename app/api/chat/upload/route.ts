import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/** POST — upload ảnh để gửi trong chat */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ ok: false, error: "Chưa chọn ảnh" }, { status: 400 });
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ ok: false, error: "Chỉ chấp nhận PNG/JPG/GIF/WEBP" }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Ảnh tối đa 10MB" }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads", "chat");
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, safe), Buffer.from(await f.arrayBuffer()));

  return NextResponse.json({ ok: true, url: `/uploads/chat/${safe}` });
}
