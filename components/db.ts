import { prisma } from "@/lib/prisma";

/** Nội dung: mỗi người chỉ thấy của mình (admin truyền undefined để xem tất cả) */
export async function getContents(limit = 10, authorId?: number) {
    return prisma.content.findMany({ where: authorId ? { authorId } : {}, orderBy: { createdAt: "desc" }, take: limit, include: { author: true } });
}

export async function getTopContents(limit = 10, authorId?: number) {
    return prisma.content.findMany({ where: authorId ? { authorId } : {}, orderBy: { views: "desc" }, take: limit });
}

export async function getUpcomingContents(limit = 8, authorId?: number) {
    return prisma.content.findMany({
        where: { scheduledAt: { gte: new Date() }, ...(authorId ? { authorId } : {}) },
        orderBy: { scheduledAt: "asc" },
        take: limit,
    });
}

/** Sự kiện ngoài trên Lịch (không gắn Content) — mỗi người chỉ thấy của mình */
export async function getCalendarEvents(limit = 300, userId?: number) {
    return prisma.calendarEvent.findMany({ where: userId ? { userId } : {}, orderBy: { eventDate: "asc" }, take: limit });
}

export async function getLeads(limit = 20) {
    return prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { owner: true } });
}

export async function getStaffUsers() {
    return prisma.user.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true, avatar: true },
    });
}

export async function getAssigneeUsers() {
    const users = await prisma.user.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true, permissions: true, avatar: true },
    });
    return users.filter((u) => {
        if (u.role === "Admin") return false;
        try { return !(JSON.parse(u.permissions || "[]") || []).includes("*"); } catch { return true; }
    });
}

export async function getTasks(limit = 50) {
    return prisma.task.findMany({ orderBy: { id: "desc" }, take: limit });
}

export async function getActivityLogs(limit = 200) {
    try {
        // Dùng Prisma client để tương thích cả SQLite lẫn SQL Server
        return await prisma.activityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                userId: true,
                userName: true,
                module: true,
                action: true,
                detail: true,
                createdAt: true,
            },
        });
    } catch {
        return [];
    }
}

export async function getOverviewStats() {
  const [contents, leadCount] = await Promise.all([
    prisma.content.findMany({ select: { views: true, leads: true } }),
    prisma.lead.count(),
  ]);
  const cViews = contents.reduce((s, c) => s + c.views, 0);
  const cLeads = contents.reduce((s, c) => s + c.leads, 0);
  const conversionRate = cViews > 0 ? ((cLeads / cViews) * 100).toFixed(2) : "0.00";
  return {
    contentCount: contents.length,
    totalViews: cViews,
    totalLeads: leadCount,
    conversionRate,
    contentLeads: cLeads,
  };
}