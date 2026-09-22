import { prisma } from "@/lib/prisma";

/**
 * TỰ ĐỘNG HOÁ — 3 tác vụ chạy định kỳ (bấm "Chạy ngay" trong Settings hoặc cron ngoài):
 * 1. Nhắc đăng bài — 2 mốc: (a) 7h sáng các bài đăng trong ngày, (b) 30 phút trước giờ đăng
 *    → thông báo cho tác giả (mỗi mốc có chống trùng riêng) + đẩy Web Push ra thiết bị
 * 2. Follow-up lead cũ: lead chưa được liên hệ sau X ngày (Settings) → thông báo cho người phụ trách
 * 3. Báo cáo tuần: tổng hợp 7 ngày (leads, nội dung, chi tiêu ads) → thông báo chung
 * Mỗi tác vụ có cơ chế chống trùng: chỉ tạo 1 thông báo cùng loại/ngày.
 */

async function getSettingValue(key: string, def: string): Promise<string> {
  try {
    const r = await prisma.setting.findUnique({ where: { key } });
    return r?.value ?? def;
  } catch {
    return def;
  }
}

/** User đại diện "Hệ thống" — thông báo chung hiển thị cho tất cả */
export async function getBroadcastUserId(): Promise<number> {
  let u = await prisma.user.findUnique({ where: { email: "system@company.vn" } });
  if (!u) {
    u = await prisma.user.create({
      data: { name: "Hệ thống", email: "system@company.vn", role: "Marketing", active: false, permissions: "[]" },
    });
  }
  return u.id;
}

async function notifiedToday(type: string, refId?: number): Promise<boolean> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const n = await prisma.notification.findFirst({
    where: { type, ...(refId ? { refId } : {}), createdAt: { gte: start } },
  });
  return !!n;
}

/** Đã gửi thông báo cùng loại/refId trong khoảng {minutes} phút gần đây? (chống trùng khi cron chạy dày) */
async function notifiedSince(type: string, refId: number, minutes: number): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000);
  const n = await prisma.notification.findFirst({
    where: { type, refId, createdAt: { gte: since } },
  });
  return !!n;
}

export type AutomationResults = { reminders: number; followups: number; weekly: boolean };

export async function runAllJobs(): Promise<AutomationResults> {
  const res: AutomationResults = { reminders: 0, followups: 0, weekly: false };
  const broadcastId = await getBroadcastUserId();
  const now = new Date();

  // ---- Job 1: NHẮC ĐĂNG BÀI — 2 mốc: (a) 7h sáng ngày đăng, (b) 1 tiếng trước giờ đăng ----
  if ((await getSettingValue("autoReminders", "true")) !== "false") {
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday.getTime() + 24 * 3600 * 1000);

    // (a) NHÁC 7H SÁNG — content có lịch đăng HÔM NAY chưa đăng (gửi trong khung 7h-11h sáng)
    const hour = now.getHours();
    if (hour >= 7 && hour < 11) {
      const todays = await prisma.content.findMany({
        where: { scheduledAt: { gte: startToday, lt: endToday } },
      });
      for (const c of todays) {
        // CHỈ gửi cho TÁC GIẢ của nội dung — content của ai thì thông báo người đó
        if (!c.authorId) continue;
        if (await notifiedToday("reminder_morning", c.id)) continue;
        const when = c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
        await prisma.notification.create({
          data: {
            userId: c.authorId,
            type: "reminder_morning",
            title: `☀️ "${c.title}" — đăng hôm nay`,
            content: `Có lịch đăng lúc ${when} hôm nay trên ${c.platform} — chuẩn bị nội dung và đăng đúng giờ nhé!`,
            refId: c.id,
            link: "/dashboard/calendar",
          },
        });
        res.reminders++;
      }
    }

    // (c) NHÁC 30 PHÚT TRƯỚC GIỜ ĐĂNG — chỉ còn ≤30 phút (mốc nhắc duy nhất trước giờ đăng)
    const inThirtyMin = new Date(now.getTime() + 30 * 60 * 1000);
    const due30 = await prisma.content.findMany({
      where: { scheduledAt: { gte: now, lte: inThirtyMin } },
    });
    for (const c of due30) {
      // CHỈ gửi cho TÁC GIẢ của nội dung — content của ai thì thông báo người đó
      if (!c.authorId) continue;
      // chống trùng: mỗi content chỉ nhắc 1 lần trong 60 phút (đủ phủ cửa sổ 30 phút)
      if (await notifiedSince("reminder_30m", c.id, 60)) continue;
      const when = c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
      await prisma.notification.create({
        data: {
          userId: c.authorId,
          type: "reminder_30m",
          title: `⏳ "${c.title}" — còn 30 phút nữa!`,
          content: `Sẽ đăng lúc ${when} trên ${c.platform} — chuẩn bị đăng ngay!`,
          refId: c.id,
          link: "/dashboard/calendar",
        },
      });
      res.reminders++;
    }
  }

  // ---- Job 2: Follow-up lead chưa liên hệ sau X ngày ----
  const days = Math.max(1, parseInt(await getSettingValue("followUpDays", "3")) || 3);
  const cutoff = new Date(now.getTime() - days * 86400000);
  const oldLeads = await prisma.lead.findMany({
    where: {
      contacted: "Chưa liên hệ",
      status: { notIn: ["Đã chốt", "Không tiềm năng"] },
      createdAt: { lt: cutoff },
    },
  });
  for (const l of oldLeads) {
    if (await notifiedToday("followup", l.id)) continue;
    await prisma.notification.create({
      data: {
        userId: l.ownerId ?? broadcastId,
        type: "followup",
        title: "📞 Follow-up lead cũ",
        content: `${l.name} (${l.phone || "—"}) đã ${days} ngày chưa được liên hệ — gọi lại ngay!`,
        refId: l.id,
        link: "/dashboard/leads",
      },
    });
    res.followups++;
  }

  // ---- Job 3: Báo cáo tuần (1 lần/tuần) ----
  if ((await getSettingValue("weeklyReport", "true")) !== "false") {
    const monday = new Date(now);
    const dow = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    const exists = await prisma.notification.findFirst({ where: { type: "weekly", createdAt: { gte: monday } } });
    if (!exists) {
      const weekStart = new Date(now.getTime() - 7 * 86400000);
      const [newLeads, newContents, adAgg, socialAgg] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.content.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.adCampaign.aggregate({ _sum: { spent: true, clicks: true } }),
        prisma.socialMetric.aggregate({ _sum: { views: true, videosPosted: true } }),
      ]);
      await prisma.notification.create({
        data: {
          userId: broadcastId,
          type: "weekly",
          title: "📊 Báo cáo tuần Marketing",
          content: `7 ngày qua: ${newLeads} leads mới · ${newContents} nội dung mới · Ads chi ${Math.round(adAgg._sum.spent || 0).toLocaleString("vi-VN")} / ${Math.round(adAgg._sum.clicks || 0).toLocaleString("vi-VN")} clicks · MXH: ${Math.round(socialAgg._sum.views || 0).toLocaleString("vi-VN")} views, ${socialAgg._sum.videosPosted || 0} video đã đăng`,
          link: "/dashboard/reports",
        },
      });
      res.weekly = true;
    }
  }

  return res;
}