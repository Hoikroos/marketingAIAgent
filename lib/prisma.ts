import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient(): PrismaClient {
  return new PrismaClient();
}

/**
 * Client dùng chung. Tự "lành" sau khi thêm model mới vào schema:
 * nếu client cũ trong globalThis thiếu model (vd calendarEvent) → tạo lại client mới.
 */
function resolveClient(): PrismaClient {
  const existing = globalForPrisma.prisma as any;
  if (existing && typeof existing.calendarEvent?.findMany === "function") {
    return existing as PrismaClient;
  }
  const fresh = createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = resolveClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
