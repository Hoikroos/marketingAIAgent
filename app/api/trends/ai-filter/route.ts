import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { isAdminLike } from "@/lib/permissions";
import { getAICfg, callAIChat } from "@/lib/aiConfig";

/**
 * POST /api/trends/ai-filter — Dùng AI lọc trend LIÊN QUAN đến công ty.
 * Lấy trend của người dùng (admin: tất cả), gửi danh sách cho AI phân loại
 * theo tên công ty + slogan trong Cài đặt, trả về các trend liên quan kèm lý do.
 */
export async function POST() {
  const denied = await requirePermApi("trends");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);

  const trends = await prisma.trend.findMany({
    where: admin ? {} : { ownerId: uid },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 80,
    select: { id: true, title: true, platform: true, category: true },
  });
  if (!trends.length) {
    return NextResponse.json({ ok: false, error: "Chưa có trend nào để lọc" }, { status: 400 });
  }

  // Tên công ty + slogan từ Cài đặt hệ thống
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string, defaultVal: string = "") => {
    const s = settings.find((x) => x.key === key);
    return s?.value || defaultVal;
  };
  const companyName = getSetting("companyName", "Tân Phú Land");
  const slogan = getSetting("slogan", "");
  const companyInfo = `${companyName}${slogan ? ` — "${slogan}"` : ""} — công ty bất động sản Việt Nam (mua bán, ký gửi, cho thuê, đầu tư đất nền/căn hộ).`;

  const list = trends.map((t, i) => `${i + 1}. [id=${t.id}] ${t.title} (${t.platform} · ${t.category})`).join("\n");
  const prompt = `CÔNG TY: ${companyInfo}
Dưới đây là danh sách trend đang nổi. Hãy đánh giá TREND NÀO LIÊN QUAN hoặc CÓ THỂ KHAI THÁC CHO CÔNG TY (nội dung bất động sản, nhà đất, đầu tư, pháp lý, cho thuê, nội thất, vay mua nhà, đời sống cư dân...). Loại bỏ trend hoàn toàn không liên quan (thể thao, giải trí, thiên tai, chính sách đối ngoại...).

DANH SÁCH TREND:
${list}

CHỈ trả về JSON mảng các trend liên quan, mỗi phần tử: {"id": <số>, "reason": "<1 câu ngắn giải thích vì sao liên quan công ty>"}. Không giải thích gì thêm.`;

  try {
    const cfg = await getAICfg();
    if (!cfg.key) {
      return NextResponse.json({ ok: false, error: "Chưa cấu hình AI — vào Cài đặt → AI & Tự động hóa để nhập key." }, { status: 400 });
    }
    const raw = await callAIChat(cfg, {
      system: "Bạn là trợ lý phân tích trend cho công ty bất động sản. Luôn trả về JSON hợp lệ, không giải thích.",
      user: prompt,
      temperature: 0.2,
      maxTokens: 4000,
      // Model free có thể chậm ~90-150s
      timeoutMs: 150_000,
    });

    // Parse JSON mảng [{id, reason}]
    const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let arr: any[] = [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) arr = j;
    } catch {
      const i = s.indexOf("["), j2 = s.lastIndexOf("]");
      if (i !== -1 && j2 > i) {
        try { arr = JSON.parse(s.slice(i, j2 + 1)); } catch {}
      }
    }
    const byId = new Map(trends.map((t) => [t.id, t]));
    const relevant = arr
      .filter((x) => byId.has(Number(x?.id)))
      .map((x) => ({
        id: Number(x.id),
        title: byId.get(Number(x.id))!.title,
        reason: String(x?.reason || "Liên quan đến lĩnh vực bất động sản của công ty").slice(0, 200),
      }));

    return NextResponse.json({ ok: true, total: trends.length, relevant });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const friendly = /timed?\s?out|TimeoutError/i.test(msg)
      ? "Model AI phản hồi quá chậm (>150s) — model free có thể đang quá tải. Thử lại hoặc đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa."
      : `AI lỗi: ${msg}`;
    return NextResponse.json({ ok: false, error: friendly }, { status: 502 });
  }
}
