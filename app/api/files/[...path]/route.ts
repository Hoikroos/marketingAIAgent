import { NextRequest, NextResponse } from "next/server";
import { readFileStored, mimeForPath } from "@/lib/storage";

/**
 * GET /api/files/<sub>/<tên-file> — phục vụ file do người dùng tải lên (runtime).
 * Next.js production CHỈ phục vụ file tồn tại trong public/ lúc build, nên ảnh/file
 * tải lên sau deploy (Render, VPS...) cần được phục vụ qua route này.
 * File được ĐỌC TỪ DATABASE (bền vững qua deploy/restart trên Render) trước,
 * fallback sang ổ đĩa (<cwd>/uploads → <cwd>/public/uploads) cho file cũ.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const rel = (params.path || []).join("/");
  if (!rel || rel.split("/").some((seg) => seg === ".." || seg === ".")) {
    return NextResponse.json({ ok: false, error: "Đường dẫn không hợp lệ" }, { status: 400 });
  }

  const data = await readFileStored(rel);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy file" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": mimeForPath(rel),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
