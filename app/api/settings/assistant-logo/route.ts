import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/guard";
import { getBotLogoUrl, setBotLogoUrl } from "@/lib/brandLogo";
import { saveFile, deleteStoredFile } from "@/lib/storage";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Lấy đường dẫn tương đối (vd "images/botlogo_x.svg") từ URL "/api/files/images/botlogo_x.svg" */
function relFromUrl(url: string): string | null {
  const m = url.match(/\/api\/files\/(.+)$/);
  return m ? m[1] : null;
}

/** POST — Admin tải LOGO CHATBOT lên (hiển thị trong khung Trợ lý AI). Lưu vào DATABASE. */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File) || f.size === 0) {
      return NextResponse.json({ ok: false, error: "Chưa chọn file ảnh" }, { status: 400 });
    }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ ok: false, error: "Chỉ chấp nhận PNG/JPG/GIF/WEBP/SVG" }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Ảnh tối đa 5MB" }, { status: 400 });
    }

    // Xoá logo chatbot cũ (nếu có)
    const oldUrl = await getBotLogoUrl();
    if (oldUrl) {
      const oldRel = relFromUrl(oldUrl);
      if (oldRel) await deleteStoredFile(oldRel);
    }

    const safe = `botlogo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    if (!(await saveFile(`images/${safe}`, buf))) {
      return NextResponse.json({ ok: false, error: "Không lưu được ảnh" }, { status: 500 });
    }
    const url = `/api/files/images/${safe}`;
    await setBotLogoUrl(url);

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE — Xoá logo chatbot tùy chỉnh, trở về icon mặc định. */
export async function DELETE() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const oldUrl = await getBotLogoUrl();
    if (oldUrl) {
      const oldRel = relFromUrl(oldUrl);
      if (oldRel) await deleteStoredFile(oldRel);
    }
    await setBotLogoUrl(null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
