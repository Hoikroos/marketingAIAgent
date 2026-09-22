import { prisma } from "@/lib/prisma";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

/**
 * Lưu trữ file BỀN VỮNG: ghi vào DATABASE (bảng StoredFile / Postgres bytea).
 *
 * Lý do: Render free tier dùng ổ đĩa TẠM THỜI — mỗi lần deploy/restart/service
 * ngủ-dậy thì mọi file trong thư mục uploads/ bị xoá sạch, khiến ảnh đại diện,
 * logo, ảnh chat, file báo cáo... "biến mất" sau 1 ngày. DB (Neon Postgres)
 * không bao giờ bị reset nên file lưu ở đây sống vĩnh viễn.
 *
 * Tương thích ngược: khi ĐỌC, nếu DB không có (file cũ trước ngày chuyển đổi)
 * thì tự fallback sang ổ đĩa (<cwd>/uploads rồi <cwd>/public/uploads).
 */

const MIME_BY_EXT: Record<string, string> = {
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

/** Chuẩn hoá đường dẫn tương đối: bỏ "uploads/" đầu, bỏ "/" đầu, chặn path traversal. */
export function normalizeRel(rel: string): string {
  const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^uploads\//, "");
  if (!clean || clean.split("/").some((seg) => seg === ".." || seg === ".")) {
    throw new Error("Đường dẫn file không hợp lệ");
  }
  return clean;
}

export function mimeForPath(rel: string): string {
  const ext = (rel.split(".").pop() || "").toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

/** Lưu file vào DB (upsert theo path). Trả về true nếu lưu DB thành công. */
export async function saveFile(rel: string, data: Buffer): Promise<boolean> {
  const clean = normalizeRel(rel);
  const mime = mimeForPath(clean);
  // Prisma Bytes yêu cầu Uint8Array<ArrayBuffer> (Buffer có buffer là ArrayBufferLike)
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  try {
    await prisma.storedFile.upsert({
      where: { path: clean },
      create: { path: clean, data: bytes, mime, size: data.length },
      update: { data: bytes, mime, size: data.length },
    });
  } catch (err) {
    console.error("[storage] Lưu file vào DB thất bại:", clean, err);
    return false;
  }
  // Best-effort: mirror ra ổ đĩa để dev/local xem trực tiếp được (không bắt buộc)
  try {
    const abs = path.join(process.cwd(), "uploads", clean);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
  } catch {}
  return true;
}

/** Đọc file: DB trước → ổ đĩa (<cwd>/uploads → <cwd>/public/uploads) cho file cũ. */
export async function readFileStored(rel: string): Promise<Buffer | null> {
  let clean: string;
  try {
    clean = normalizeRel(rel);
  } catch {
    return null;
  }
  try {
    const rec = await prisma.storedFile.findUnique({ where: { path: clean }, select: { data: true } });
    if (rec?.data) return Buffer.from(rec.data);
  } catch {}
  // Fallback: file cũ nằm trên ổ đĩa (trước ngày chuyển sang lưu DB)
  const roots = [
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "public", "uploads"),
  ];
  for (const root of roots) {
    const abs = path.resolve(root, clean);
    if (abs !== path.resolve(root) && !abs.startsWith(path.resolve(root) + path.sep)) continue;
    try {
      return await readFile(abs);
    } catch {}
  }
  return null;
}

/** Xoá file khỏi DB + ổ đĩa (best-effort, không ném lỗi). */
export async function deleteStoredFile(rel: string): Promise<void> {
  let clean: string;
  try {
    clean = normalizeRel(rel);
  } catch {
    return;
  }
  try {
    await prisma.storedFile.delete({ where: { path: clean } });
  } catch {}
  try {
    await unlink(path.join(process.cwd(), "uploads", clean));
  } catch {}
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", clean));
  } catch {}
}
