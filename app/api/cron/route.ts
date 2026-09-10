import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAllJobs } from "@/lib/automation";

/**
 * GET /api/cron?key=CRON_SECRET — chạy các tác vụ tự động từ cron ngoài
 * (VD: cron-job.org gọi URL này mỗi ngày lúc 8h sáng).
 * CRON_SECRET lấy từ Cài đặt → Tự động hoá (bấm "Tạo") hoặc biến môi trường CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const key = (req.nextUrl.searchParams.get("key") || "").trim();
  let secret = "";
  try {
    const r = await prisma.setting.findUnique({ where: { key: "cronSecret" } });
    secret = (r?.value || "").trim();
  } catch {}
  if (!secret && process.env.CRON_SECRET) secret = process.env.CRON_SECRET.trim();

  if (!secret) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình Cron Secret trong Cài đặt" }, { status: 401 });
  }
  if (key !== secret) {
    return NextResponse.json({ ok: false, error: "Key không đúng" }, { status: 403 });
  }

  try {
    const results = await runAllJobs();
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}