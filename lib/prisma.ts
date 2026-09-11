import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

/**
 * Xây dựng client + extension: SAU KHI tạo 1 Notification (lead mới, task giao,
 * báo cáo, nhắc lịch đăng, thông báo chung...) → tự đẩy Web Push ra các thiết bị
 * của user. Chỉnh 1 điểm duy nhất ở đây thay vì sửa từng nơi gọi notification.create.
 */
function buildClient(): any {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      notification: {
        async create({ args, query }: any) {
          const result: any = await query(args);
          try {
            if (result?.userId && result?.title) {
              import("./push")
                .then((m) =>
                  m.sendPushToUser(Number(result.userId), {
                    title: String(result.title),
                    body: String(result.content || ""),
                    link: result.link || "/dashboard/notifications",
                  })
                )
                .catch(() => {});
            }
          } catch {}
          return result;
        },
      },
    },
  });
}

/**
 * Client dùng chung. Tự "lành" sau khi thêm model mới vào schema:
 * nếu client cũ trong globalThis thiếu model (vd calendarEvent) → tạo lại client mới.
 * Extended client (chỉ bọc thêm push cho notification.create) cast về kiểu gốc
 * để toàn bộ codebase giữ nguyên type PrismaClient.
 */
function resolveClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && typeof existing.calendarEvent?.findMany === "function") {
    return existing as PrismaClient;
  }
  const fresh = buildClient() as unknown as PrismaClient;
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = resolveClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
