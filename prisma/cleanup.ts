import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Xoá TOÀN BỘ dữ liệu của nền tảng "Instagram" (đã bị loại khỏi hệ thống).
 * Không ảnh hưởng đến các dữ liệu khác.
 * Chạy: npm run db:cleanup
 */
async function main() {
  const [contents, leads] = await Promise.all([
    prisma.content.deleteMany({ where: { platform: "Instagram" } }),
    prisma.lead.deleteMany({ where: { source: "Instagram" } }),
  ]);

  console.log("✅ Đã xoá dữ liệu Instagram:");
  console.log("   - Content:", contents.count);
  console.log("   - Lead:", leads.count);
}

main()
  .catch((e) => {
    console.error("❌ Xoá thất bại:", e.message);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
