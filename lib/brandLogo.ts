import { promises as fs } from "fs";
import path from "path";

/**
 * Quản lý đường dẫn logo tùy chỉnh do admin tải lên ở Cài đặt hệ thống.
 * Lưu file ảnh vào public/uploads/images và ghi 1 file cấu hình nhỏ (data/brand-logo.json)
 * để KHÔNG phụ thuộc vào schema/database — tránh phải migrate Prisma cho từng môi trường.
 * Nếu chưa có logo tùy chỉnh → trả null (app rơi về logo mặc định).
 */
const CONFIG = path.join(process.cwd(), "data", "brand-logo.json");

async function readConfig(): Promise<{ logoUrl?: string | null; botLogoUrl?: string | null }> {
  try {
    const raw = await fs.readFile(CONFIG, "utf-8");
    const j = JSON.parse(raw);
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

export async function getLogoUrl(): Promise<string | null> {
  const j = await readConfig();
  return j && typeof j.logoUrl === "string" && j.logoUrl ? j.logoUrl : null;
}

export async function setLogoUrl(url: string | null) {
  const j = await readConfig();
  await fs.mkdir(path.dirname(CONFIG), { recursive: true });
  await fs.writeFile(CONFIG, JSON.stringify({ ...j, logoUrl: url || null }), "utf-8");
}

/** Logo của TRỢ LÝ AI (chatbot) — upload ở Cài đặt hệ thống, dùng trong khung chat */
export async function getBotLogoUrl(): Promise<string | null> {
  const j = await readConfig();
  return j && typeof j.botLogoUrl === "string" && j.botLogoUrl ? j.botLogoUrl : null;
}

export async function setBotLogoUrl(url: string | null) {
  const j = await readConfig();
  await fs.mkdir(path.dirname(CONFIG), { recursive: true });
  await fs.writeFile(CONFIG, JSON.stringify({ ...j, botLogoUrl: url || null }), "utf-8");
}
