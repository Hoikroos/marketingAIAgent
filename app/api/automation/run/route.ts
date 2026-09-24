import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/guard";
import { runAllJobs } from "@/lib/automation";
import { logActivity } from "@/lib/activity";

/** POST /api/automation/run — Admin bấm "Chạy ngay" các tác vụ tự động */
export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const results = await runAllJobs();
    try {
      await logActivity("automation", "create", `Chạy tác vụ: ${results.reminders} nhắc đăng bài${results.weekly ? ", tạo báo cáo tuần" : ""}`);
    } catch {}
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}