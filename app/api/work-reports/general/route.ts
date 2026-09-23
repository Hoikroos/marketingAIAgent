import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import {
  collectMonthData,
  synthesizeMonth,
  getGeneralCache,
  saveGeneralCache,
  buildDocxParas,
  toPublicJson,
} from "@/lib/monthlyReport";
import { buildDocx } from "@/lib/docx";

/** Người được phép tổng hợp / tải Báo cáo chung: Admin hoặc người quản lý báo cáo */
function canManage(user: any) {
  return !!user && (isAdminLike(user) || canAccess(user, "users") || canAccess(user, "reports_work_create"));
}
/** Xem tổng hợp của TẤT CẢ nhân viên: quản lý + người có quyền xem nhật ký tất cả */
function canViewAllEmployees(user: any) {
  return canManage(user) || canAccess(user, "dailyreports_viewall");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** GET /api/work-reports/general?year=&month= — dữ liệu Báo cáo chung để hiển thị trên Dashboard */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
    return NextResponse.json({ ok: false, error: "Tháng/năm không hợp lệ" }, { status: 400 });
  }

  const data = await collectMonthData(year, month);
  const cache = await getGeneralCache(year, month);
  const all = canViewAllEmployees(user);
  const onlyUserId = all ? undefined : Number(user.id);

  return NextResponse.json({
    ok: true,
    ...toPublicJson(data, cache, { all, onlyUserId }),
    cacheInfo: cache ? { provider: cache.provider, model: cache.model, generatedAt: cache.generatedAt, generatedBy: cache.generatedBy } : null,
  });
}

/** POST /api/work-reports/general { year, month, mode: "synthesize" | "word" }
 *  - "synthesize": chạy AI tổng hợp + lưu cache (đồng bộ với Dashboard)
 *  - "word": tổng hợp + trả về file Word "Báo cáo chung tháng" để Admin tải về */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  // Chỉ Admin/quản lý mới được tổng hợp (tốn chi phí AI) và tải file Word
  if (!canManage(user)) {
    return NextResponse.json({ ok: false, error: "Chỉ Admin/quản lý mới được tổng hợp Báo cáo chung" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = Number(body.year) || now.getFullYear();
    const month = Number(body.month) || now.getMonth() + 1;
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
      return NextResponse.json({ ok: false, error: "Tháng/năm không hợp lệ" }, { status: 400 });
    }
    const mode = body.mode === "word" ? "word" : "synthesize";

    const data = await collectMonthData(year, month);
    const cache = await synthesizeMonth(data, String(user.name || ""));
    await saveGeneralCache(year, month, cache);

    try {
      await logActivity(
        "workreports",
        mode === "word" ? "export" : "create",
        `${mode === "word" ? "Tải file Word" : "Tổng hợp AI"} — Báo cáo chung ${data.label} (${data.employees.length} nhân viên${cache.aiUsed ? `, AI: ${cache.provider}` : ", fallback"})`
      );
    } catch {}

    if (mode === "word") {
      const doc = buildDocx(buildDocxParas(data, cache));
      const filename = `bao-cao-chung-thang-${pad2(month)}-${year}.docx`;
      return new NextResponse(new Uint8Array(doc), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(doc.length),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      aiUsed: cache.aiUsed,
      cacheInfo: { provider: cache.provider, model: cache.model, generatedAt: cache.generatedAt, generatedBy: cache.generatedBy },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}