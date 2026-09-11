import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/files/<sub>/<tên-file> — phục vụ file do người dùng tải lên (runtime).
 * Next.js production CHỈ phục vụ file tồn tại trong public/ lúc build, nên ảnh/file
 * tải lên sau deploy (Render, VPS...) cần được phục vụ qua route này.
 * Thứ tự tìm: <cwd>/uploads (chỗ lưu mới) → <cwd>/public/uploads (file cũ, tương thích ngược).
 */
const ROOTS = [
  path.join(process.cwd(), "uploads"),
  path.join(process.cwd(), "public", "uploads"),
];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const rel = (params.path || []).join("/");
  if (!rel || rel.split("/").some((seg) => seg === ".." || seg === ".")) {
    return NextResponse.json({ ok: false, error: "Đường dẫn không hợp lệ" }, { status: 400 });
  }

  for (const root of ROOTS) {
    const abs = path.resolve(root, rel);
    // Chống path traversal: file phải nằm trong root
    if (abs !== path.resolve(root) && !abs.startsWith(path.resolve(root) + path.sep)) continue;
    try {
      const data = await readFile(abs);
      const ext = (abs.split(".").pop() || "").toLowerCase();
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      // thử root tiếp theo
    }
  }

  return NextResponse.json({ ok: false, error: "Không tìm thấy file" }, { status: 404 });
}
