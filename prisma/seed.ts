import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

/**
 * Seed dữ liệu ban đầu cho database mới (Neon Postgres).
 * - Tạo tài khoản Admin + nhân viên mẫu (nếu chưa có)
 * - Tạo cấu hình mặc định (tên công ty, màu thương hiệu...)
 * Chạy: npx tsx prisma/seed.ts
 * Chạy nhiều lần an toàn (không trùng lặp, không xoá dữ liệu cũ).
 *
 * BẢO MẬT: KHÔNG đặt mật khẩu cứng trong file này (repo là public).
 * Mật khẩu được sinh NGẪU NHIÊN khi seed và chỉ in ra console MỘT LẦN —
 * hãy đăng nhập ngay và đổi lại mật khẩu trong Hồ sơ cá nhân.
 */
function randomPassword() {
  // ~12 ký tự, gồm chữ hoa/thường + số, dễ đọc để copy
  return randomBytes(9).toString("base64url");
}

const USERS = [
  { name: "Quản trị viên", email: "admin@company.vn", role: "Admin", jobTitle: "Quản trị hệ thống" },
  { name: "Marketing Team", email: "marketing@company.vn", role: "Admin", jobTitle: "Trưởng phòng Marketing" },
  { name: "Trần Minh Trang", email: "trang@company.vn", role: "Video Editor", jobTitle: "Chuyên viên Content TikTok" },
];

const SETTINGS: Record<string, string> = {
  companyName: "Tân Phú Land",
  brandColor: "#1b98e0",
  slogan: "Marketing Bất Động Sản thông minh với AI",
  notifyTask: "true",
  notifyReport: "true",
  notifyTrend: "true",
  notifyContent: "true",
  notifyViral: "true",
  followUpDays: "3",
};

async function main() {
  console.log("── SEED DỮ LIỆU BAN ĐẦU ──");
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`⏭  User đã tồn tại: ${u.email}`);
      continue;
    }
    const password = randomPassword();
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role,
        jobTitle: u.jobTitle,
        passwordHash: hashPassword(password),
        permissions: "[]",
        active: true,
      },
    });
    console.log(`✅ Đã tạo user: ${u.email} (mật khẩu tạm: ${password} — HÃY ĐỔI NGAY sau lần đăng nhập đầu!)`);
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`✅ Đã tạo ${Object.keys(SETTINGS).length} cấu hình mặc định`);
  console.log("── XONG ──");
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e.message);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
