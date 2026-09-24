import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  canExportGeneralReportWord,
  canSynthesizeGeneralReport,
  canViewGeneralReportAll,
} from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import {
  collectMonthData,
  synthesizeMonth,
  getGeneralCache,
  saveGeneralCache,
  fallbackCache,
  buildDocxParas,
  toPublicJson,
  type GeneralCache,
} from "@/lib/monthlyReport";
import { buildDocx } from "@/lib/docx";

// ---------------------------------------------------------------------------
// PHÂN QUYỀN 2 NÚT của khối "Báo cáo chung" (Dashboard) — xem lib/permissions.ts:
//  - Tổng hợp bằng AI  → canSynthesizeGeneralReport(user)
//      Admin/quản lý (users, reports_work_create) hoặc được cấp
//      `reports_work_synthesize` (mặc định KHÔNG cấp cho nhân viên mới).
//  - Tải file Word     → canExportGeneralReportWord(user)
//      Người tổng hợp được, hoặc được cấp riêng `reports_work_export_general`.
//      Người CHỈ có quyền tải Word dùng lại bản tổng hợp AI đã cache
//      (không gọi AI → không phát sinh chi phí).
//  - Xem tổng hợp của TẤT CẢ nhân viên → canViewGeneralReportAll(user)
//      (thêm quyền `dailyreports_viewall` như trước).
// ---------------------------------------------------------------------------


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
  const all = canViewGeneralReportAll(user);
  const onlyUserId = all ? undefined : Number(user.id);

  return NextResponse.json({
    ok: true,
    ...toPublicJson(data, cache, { all, onlyUserId }),
    canSynthesize: canSynthesizeGeneralReport(user),
    canExportWord: canExportGeneralReportWord(user),
    cacheInfo: cache ? { provider: cache.provider, model: cache.model, generatedAt: cache.generatedAt, generatedBy: cache.generatedBy } : null,
  });
}

/** POST /api/work-reports/general { year, month, mode: "synthesize" | "word" }
 *  - "synthesize": chạy AI tổng hợp + lưu cache (đồng bộ với Dashboard) → cần quyền tổng hợp
 *  - "word": trả về file Word "Báo cáo chung tháng" để tải về → cần quyền tải/xuất */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = Number(body.year) || now.getFullYear();
    const month = Number(body.month) || now.getMonth() + 1;
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
      return NextResponse.json({ ok: false, error: "Tháng/năm không hợp lệ" }, { status: 400 });
    }
    const mode = body.mode === "word" ? "word" : "synthesize";

    const maySynthesize = canSynthesizeGeneralReport(user);
    const mayExportWord = canExportGeneralReportWord(user);
    if (mode === "word" ? !mayExportWord : !maySynthesize) {
      return NextResponse.json(
        {
          ok: false,
          error:
            mode === "word"
              ? 'Bạn chưa được cấp quyền tải Báo cáo chung (file Word). Liên hệ Admin cấp quyền "Tải Báo cáo chung (file Word)".'
              : 'Bạn chưa được cấp quyền tổng hợp Báo cáo chung bằng AI. Liên hệ Admin cấp quyền "Tổng hợp Báo cáo chung (AI)".',
        },
        { status: 403 }
      );
    }

    const data = await collectMonthData(year, month);
    let cache: GeneralCache;
    if (mode === "word" && !maySynthesize) {
      // Chỉ có quyền tải Word → dùng lại bản AI đã tổng hợp trước đó (nếu có),
      // chưa có thì dùng mẫu tự động — KHÔNG gọi AI để tránh phát sinh chi phí.
      cache = (await getGeneralCache(year, month)) ?? fallbackCache(data, String(user.name || ""));
    } else {
      cache = await synthesizeMonth(data, String(user.name || ""));
      await saveGeneralCache(year, month, cache);
    }

    try {
      await logActivity(
        "workreports",
        mode === "word" ? "export" : "create",
        `${mode === "word" ? "Tải file Word" : "Tổng hợp AI"} — Báo cáo chung ${data.label} (${data.employees.length} nhân viên${cache.aiUsed ? `, AI: ${cache.provider}` : ", mẫu tự động"})`
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