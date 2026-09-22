import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/guard";
import { getLogoUrl, setLogoUrl } from "@/lib/brandLogo";
import { saveFile, deleteStoredFile } from "@/lib/storage";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_LOGO = "logoTPL.png";

/** Lấy đường dẫn tương đối (vd "images/logo_x.svg") từ URL "/api/files/images/logo_x.svg" */
function relFromUrl(url: string): string | null {
  const m = url.match(/\/api\/files\/(.+)$/);
  return m ? m[1] : null;
}

/** POST — Admin tải logo lên (lưu vào DATABASE, bền vững qua deploy/restart) và cập nhật cấu hình. */
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

    // Xoá logo cũ (nếu là logo tùy chỉnh, không xoá file mặc định)
    const oldUrl = await getLogoUrl();
    if (oldUrl) {
      const oldName = oldUrl.split("/").pop();
      if (oldName && oldName !== DEFAULT_LOGO) {
        const oldRel = relFromUrl(oldUrl);
        if (oldRel) await deleteStoredFile(oldRel);
      }
    }

    const safe = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    if (!(await saveFile(`images/${safe}`, buf))) {
      return NextResponse.json({ ok: false, error: "Không lưu được ảnh" }, { status: 500 });
    }
    const url = `/api/files/images/${safe}`;
    await setLogoUrl(url);

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE — Xoá logo tùy chỉnh, trở về logo mặc định. */
export async function DELETE() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const oldUrl = await getLogoUrl();
    if (oldUrl) {
      const oldName = oldUrl.split("/").pop();
      if (oldName && oldName !== DEFAULT_LOGO) {
        const oldRel = relFromUrl(oldUrl);
        if (oldRel) await deleteStoredFile(oldRel);
      }
    }
    await setLogoUrl(null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
