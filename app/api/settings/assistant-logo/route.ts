import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/guard";
import { getBotLogoUrl, setBotLogoUrl } from "@/lib/brandLogo";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const LOGO_DIR = path.join(process.cwd(), "public", "uploads", "images");

/** POST — Admin tải LOGO CHATBOT lên (hiển thị trong khung Trợ lý AI). */
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
      const oldName = oldUrl.split("/").pop();
      if (oldName) {
        try { await unlink(path.join(LOGO_DIR, oldName)); } catch {}
      }
    }

    await mkdir(LOGO_DIR, { recursive: true });
    const safe = `botlogo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await writeFile(path.join(LOGO_DIR, safe), Buffer.from(await f.arrayBuffer()));
    const url = `/uploads/images/${safe}`;
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
      const oldName = oldUrl.split("/").pop();
      if (oldName) {
        try { await unlink(path.join(LOGO_DIR, oldName)); } catch {}
      }
    }
    await setBotLogoUrl(null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
