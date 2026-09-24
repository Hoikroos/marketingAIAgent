import { prisma } from "@/lib/prisma";
import { notifyEnabled, broadcastUserId, notifiedToday, notifiedSince, notifiedEver, safeNotify } from "@/lib/notify";

/**
 * TỰ ĐỘNG HOÁ — các tác vụ chạy định kỳ (scheduler nội bộ/instrumentation,
 * nút "Chạy ngay" trong Settings hoặc cron ngoài):
 * 1. Nhắc đăng bài — 2 mốc: (a) 7h sáng các bài đăng trong ngày, (b) 30 phút trước giờ đăng
 *    → thông báo cho tác giả (mỗi mốc có chống trùng riêng) + đẩy Web Push ra thiết bị
 * 2. Follow-up lead cũ: lead chưa được liên hệ sau X ngày (Settings) → thông báo chung (không gán người phụ trách)
 * 3. Báo cáo tuần: tổng hợp 7 ngày (leads, nội dung, chi tiêu ads) → thông báo chung
 * 4. Task hết hạn hôm nay / quá hạn chưa hoàn thành → thông báo người được giao (1 lần/ngày)
 * 5. Sự kiện lịch diễn ra hôm nay → thông báo cho chủ sự kiện (1 lần/ngày)
 * 6. Nội dung viral (leads >= 5) → chúc mừng tác giả (1 lần duy nhất mỗi content)
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
  return broadcastUserId();
}

export type AutomationResults = {
  reminders: number;
  followups: number;
  weekly: boolean;
  taskDeadlines: number;
  calendarEvents: number;
  viral: number;
};

export async function runAllJobs(): Promise<AutomationResults> {
  const res: AutomationResults = { reminders: 0, followups: 0, weekly: false, taskDeadlines: 0, calendarEvents: 0, viral: 0 };
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
        userId: broadcastId,
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

  // ---- Job 4: Task hết hạn hôm nay / đã quá hạn mà chưa hoàn thành ----
  {
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);
    const tasks = await prisma.task.findMany({
      where: { deadline: { lte: endToday }, NOT: { status: { contains: "hoàn thành" } } },
    });
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    for (const t of tasks) {
      const deadline = t.deadline ? new Date(t.deadline) : null;
      if (!deadline) continue;
      // Chỉ quan tâm: hết hạn hôm nay, hoặc đã quá hạn (quá hạn > 7 ngày thì bỏ — cũ quá)
      const overdueDays = Math.floor((startToday.getTime() - deadline.getTime()) / 86400000);
      const dueToday = deadline >= startToday && deadline <= endToday;
      const overdue = overdueDays > 0 && overdueDays <= 7;
      if (!dueToday && !overdue) continue;
      // Gửi cho từng người được giao
      const assignees = (t.assignee || "").split(" · ").map((s) => s.trim()).filter(Boolean);
      for (const nm of assignees) {
        const u = await prisma.user.findFirst({ where: { name: { equals: nm }, active: true }, select: { id: true } });
        if (!u) continue;
        if (await notifiedToday("task_deadline", t.id)) continue;
        const when = deadline.toLocaleDateString("vi-VN");
        await safeNotify({
          userId: u.id,
          type: "task_deadline",
          title: overdue ? `⏰ Đã quá hạn: "${t.title}"` : `⏰ Hết hạn hôm nay: "${t.title}"`,
          content: overdue
            ? `Deadline ${when} — trễ ${overdueDays} ngày. Ưu tiên xử lý hoặc cập nhật tiến độ!`
            : `Deadline là hôm nay (${when})${t.priority ? " — ưu tiên: " + t.priority : ""}.`,
          refId: t.id,
          link: "/dashboard/team",
        });
        res.taskDeadlines++;
      }
    }
  }

  // ---- Job 5: Sự kiện lịch diễn ra hôm nay → nhắc chủ sự kiện ----
  {
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday.getTime() + 24 * 3600 * 1000);
    const events = await prisma.calendarEvent.findMany({
      where: { eventDate: { gte: startToday, lt: endToday } },
    });
    for (const ev of events) {
      if (await notifiedToday("calendar_event", ev.id)) continue;
      const when = new Date(ev.eventDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      await safeNotify({
        userId: ev.userId,
        type: "calendar_event",
        title: `📅 Hôm nay: "${ev.title}"`,
        content: `Sự kiện diễn ra hôm nay${when ? " lúc " + when : ""} — chuẩn bị nhé!`,
        refId: ev.id,
        link: "/dashboard/calendar",
      });
      res.calendarEvents++;
    }
  }

  // ---- Job 6: Nội dung viral (leads >= 5) → chúc mừng tác giả + thông báo chung ----
  if ((await notifyEnabled("notifyViral"))) {
    const viralContents = await prisma.content.findMany({
      where: { leads: { gte: 5 } },
      orderBy: { leads: "desc" },
      take: 10,
    });
    for (const c of viralContents) {
      if (await notifiedEver("viral", c.id)) continue; // mỗi content chỉ báo 1 lần
      await safeNotify({
        userId: c.authorId ?? broadcastId,
        type: "viral",
        title: `🎉 "${c.title}" đang viral!`,
        content: `Đã mang về ${c.leads} leads • ${c.views.toLocaleString("vi-VN")} views trên ${c.platform}. Tiếp tục phát huy!`,
        refId: c.id,
        link: "/dashboard/content",
      });
      res.viral++;
    }
  }

  return res;
}