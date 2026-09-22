import { NextRequest, NextResponse } from "next/server";
import { requirePermApi } from "@/lib/guard";
import { saveFile } from "@/lib/storage";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp"];
const DOC_EXT = ["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"];
const ALLOWED = [...IMAGE_EXT, ...DOC_EXT];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/assistant/upload — đính kèm file/hình ảnh vào chat Trợ lý AI.
 * Lưu vào DATABASE (bền vững qua deploy/restart), trả { url, name, type: "image"|"file", size }.
 */
export async function POST(req: NextRequest) {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;

  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File) || f.size === 0) {
      return NextResponse.json({ ok: false, error: "Chưa chọn file" }, { status: 400 });
    }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ ok: false, error: "Chỉ chấp nhận ảnh (PNG/JPG/GIF/WEBP) hoặc file PDF/DOC(X)/TXT/CSV/XLS(X)/PPT(X)/ZIP" }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File tối đa 10MB" }, { status: 400 });
    }

    const safe = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    if (!(await saveFile(`chat/${safe}`, buf))) {
      return NextResponse.json({ ok: false, error: "Không lưu được file" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url: `/api/files/chat/${safe}`,
      name: f.name.slice(0, 120),
      type: IMAGE_EXT.includes(ext) ? "image" : "file",
      size: f.size,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
