import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Ghi LỊCH SỬ HOẠT ĐỘNG của người dùng: đã dùng chức năng (module) nào,
 * thao tác gì (action), làm trên đối tượng nào (detail), vào lúc nào (createdAt).
 * Dùng raw SQL để hoạt động ngay cả khi client Prisma chưa được regen (không đợi
 * khởi động lại server). Không làm treo luồng chính nếu ghi lỗi.
 */
export async function logActivity(module: string, action: string, detail?: string) {
  try {
    const u = await getCurrentUser();
    // Dùng Prisma client — khớp schema, chạy được trên cả SQLite và SQL Server
    await prisma.activityLog.create({
      data: {
        userId: u ? Number(u.id) : null,
        userName: u?.name || null,
        module: module.slice(0, 50),
        action: action.slice(0, 50),
        detail: detail?.slice(0, 500) || null,
      },
    });
  } catch {}
}

