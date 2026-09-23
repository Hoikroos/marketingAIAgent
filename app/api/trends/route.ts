import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { getAICfg, callAIChat } from "@/lib/aiConfig";
import { notifyEnabled, safeNotify } from "@/lib/notify";

// ---------------------------------------------------------------------------
// Xu hướng BĐS — RIÊNG TỬNG NGƯỜI (owner): ai thu thập/nhập thì của người đó.
// Admin xem được tất cả.
// ---------------------------------------------------------------------------

const RE_KEYWORDS = [
  "nhà", "đất", "bất động sản", "bđs", "căn hộ", "chung cư", "bán nhà", "cho thuê",
  "sổ đỏ", "sổ hồng", "vay", "ngân hàng", "lãi suất", "phòng trọ", "mua", "nhà đất",
  "đất nền", "khu đô thị", "dự án", "real estate", "apartment", "housing", "land",
];

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseTraffic(t: string): number {
  const m = /^([\d.,]+)\s*([KkMm])?\+?$/.exec(t.trim());
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return 0;
  if (/^m/i.test(m[2] || "")) return Math.round(n * 1_000_000);
  if (/^k/i.test(m[2] || "")) return Math.round(n * 1_000);
  return Math.round(n);
}

/** Google Trends VN (RSS thật, không cần key) — CHỈ giữ mục liên quan BĐS */
async function fetchGoogleTrends() {
  const out: { title: string; platform: string; category: string; views: number; growth: number; score: number; source: string; recommendation: string }[] = [];
  try {
    const r = await fetch("https://trends.google.com/trending/rss?geo=VN", {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return out;
    const xml = await r.text();
    const chunks = xml.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
    for (const chunk of chunks) {
      const rawTitle = /<title>(.*?)<\/title>/.exec(chunk)?.[1] || "";
      const title = decodeXml(rawTitle);
      if (!title) continue;
      const low = title.toLowerCase();
      // CHỈ nhận mục liên quan BĐS — bỏ các trend thời sự chung không liên quan
      if (!RE_KEYWORDS.some((k) => low.includes(k))) continue;
      const traffic = parseTraffic(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(chunk)?.[1] || "");
      out.push({
        title,
        platform: "Google",
        category: "Tìm kiếm",
        views: traffic,
        growth: 0,
        score: Math.min(100, Math.round(traffic / 1000) + 20),
        source: "google-trends",
        recommendation: "Chủ đề tìm kiếm đang nóng liên quan BĐS — cân nhắc làm content giải đáp.",
      });
    }
  } catch {}
  return out;
}

/** Google News RSS — TIN NÓNG BĐS thật, kèm đường dẫn bài gốc */
async function fetchGoogleNews() {
  const out: {
    title: string; platform: string; category: string; views: number; growth: number;
    score: number; source: string; recommendation: string | null; link: string | null; note: string | null;
  }[] = [];
  // Các truy vấn CHỈ bám chủ đề BĐS + lợi ích cho công ty (thị trường, chính sách, tín dụng, cho thuê, pháp lý)
  const queries = [
    "bất động sản",
    "thị trường bất động sản",
    "giá đất",
    "chung cư",
    "đất nền",
    "cho thuê nhà đất",
    "sổ đỏ sổ hồng",
    "lãi suất vay mua nhà",
  ];
  const seen = new Set<string>();
  for (const q of queries) {
    try {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=vi&gl=VN&ceid=VN:vi";
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) continue;
      const xml = await r.text();
      const chunks = xml.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
      for (const chunk of chunks) {
        const rawTitle = /<title>(.*?)<\/title>/.exec(chunk)?.[1] || "";
        const link = /<link>(.*?)<\/link>/.exec(chunk)?.[1]?.trim() || "";
        const pubDate = /<pubDate>(.*?)<\/pubDate>/.exec(chunk)?.[1] || "";
        const publisher = /<source[^>]*>(.*?)<\/source>/.exec(chunk)?.[1] || "";
        const fullTitle = decodeXml(rawTitle);
        const sep = fullTitle.lastIndexOf(" - ");
        const title = sep > 20 ? fullTitle.slice(0, sep) : fullTitle;
        const src = publisher ? decodeXml(publisher) : sep > 20 ? fullTitle.slice(sep + 3) : "";
        const key = title.toLowerCase();
        if (!title || seen.has(key)) continue;
        seen.add(key);
        const ageHours = pubDate ? (Date.now() - new Date(pubDate).getTime()) / 3600000 : 24;
        const score = Math.max(40, Math.min(95, Math.round(95 - Math.max(0, ageHours) * 2)));
        out.push({
          title,
          platform: "Tin tức",
          category: "Tin nóng",
          views: 0,
          growth: 0,
          score,
          source: "google-news",
          recommendation: src ? "📰 Nguồn: " + src : null,
          link: link || null,
          note: null,
        });
        if (out.length >= 20) return out;
      }
    } catch {}
  }
  return out;
}

// ---------- Cấu hình AI dùng chung từ lib/aiConfig (Settings ưu tiên, .env fallback) ----------

function extractJsonArray(raw: string): any[] {
  const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const j = JSON.parse(s);
    return Array.isArray(j) ? j : Array.isArray(j?.trends) ? j.trends : [];
  } catch {}
  const i = s.indexOf("[");
  const j = s.lastIndexOf("]");
  if (i !== -1 && j > i) {
    try {
      const arr = JSON.parse(s.slice(i, j + 1));
      return Array.isArray(arr) ? arr : [];
    } catch {}
  }
  return [];
}

/** Link tìm kiếm theo nền tảng — trend AI luôn có đường dẫn để tra cứu */
function trendSearchLink(platform: string, title: string): string {
  const q = encodeURIComponent(title.slice(0, 100));
  if (platform === "Facebook") return `https://www.facebook.com/search/top?q=${q}`;
  if (platform === "YouTube") return `https://www.youtube.com/results?search_query=${q}`;
  if (platform === "Google") return `https://www.google.com/search?q=${q}`;
  // TikTok / mặc định
  return `https://www.tiktok.com/search?q=${q}`;
}

/** AI tổng hợp 8 trend BĐS TikTok/Facebook (ước lượng) — kèm đường dẫn tra cứu */
async function fetchAITrends(): Promise<{ trends: any[]; error: string | null }> {
  const cfg = await getAICfg();
  if (!cfg.key) return { trends: [], error: null };
  // Luôn bám vào NĂM HIỆN TẠI + quý gần nhất — không trả trend của các năm cũ
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  const dateLine = `Thời điểm hiện tại: năm ${year}, quý ${quarter} (tháng ${month}/${year}).`;
  // Bối cảnh công ty từ Cài đặt hệ thống — chỉ lấy trend CÓ LỢI cho công ty
  let companyLine = "";
  try {
    const s = await prisma.setting.findMany();
    const cn = s.find((x) => x.key === "companyName")?.value?.trim() || "Tân Phú Land";
    const sl = s.find((x) => x.key === "slogan")?.value?.trim() || "";
    companyLine = `CÔNG TY: ${cn}${sl ? ` — "${sl}"` : ""} — hoạt động trong lĩnh vực bất động sản Việt Nam (mua bán, ký gửi, cho thuê, đầu tư đất nền/căn hộ).\nYÊU CẦU QUAN TRỌNG: CHỈ chọn trend CÓ LỢI hoặc CÓ THỂ KHAI THÁC cho công ty này — giúp tiếp cận khách mua/ký gửi/cho thuê, xây dựng thương hiệu BĐS. Loại bỏ trend không mang lại lợi ích kinh doanh.`;
  } catch {}
  const prompt = `Bạn là chuyên gia marketing bất động sản Việt Nam. ${dateLine}\n${companyLine}\nNHIỆM VỤ: liệt kê đúng 8 xu hướng (trend) nội dung BĐS HOT NHẤT HIỆN TẠI (năm ${year}, tập trung quý ${quarter} và những tháng gần nhất) trên TIKTOK (video ngắn) và FACEBOOK (groups BĐS, Reels, Marketplace).\nYÊU CẦU BẮT BUỘC:\n- CHỈ lấy trend ĐANG NỔI trong năm ${year} — TUYỆT ĐỐI KHÔNG trả trend cũ của các năm trước (2023, 2024, 2025...) đã lỗi thời.\n- Ưu tiên: chủ đề vừa xuất hiện/gây bão gần đây, format video ngắn mới nhất, hành vi tìm kiếm mới của người mua năm ${year}, chính sách/lãi suất mới nhất đang áp dụng.\nMỗi trend gồm:\n- "title": tên trend ngắn gọn, hấp dẫn (tiếng Việt), nên chứa từ khoá mang tính thời điểm năm ${year} nếu phù hợp\n- "platform": "TikTok" hoặc "Facebook"\n- "category": một trong ["Giá đất","Chính sách","Cho thuê","Đầu tư","Mẫu nhà","Pháp lý","Vay mua nhà","Nội thất","Khác"]\n- "views": số liệu tương tác/quan tâm ước tính (số nguyên)\n- "growth": tốc độ tăng trưởng ước tính % (số)\n- "score": điểm độ nóng 0-100 tính theo mức độ viral HIỆN TẠI năm ${year}\n- "recommendation": 1 câu gợi ý góc làm content bám theo trend năm ${year} VÀ có lợi cho công ty\n- "link": đường dẫn tới bài đăng/video/hashtag tham khảo về trend này nếu bạn biết URL thật (không bịa URL — nếu không chắc chắn thì trả về chuỗi rỗng "")\nCHỈ trả về JSON mảng, không giải thích.`;

  try {
    const raw = await callAIChat(cfg, {
      system: "Bạn là trợ lý phân tích trend bất động sản Việt Nam. Luôn trả về JSON hợp lệ, không giải thích.",
      user: prompt,
      temperature: 0.7,
      // Model reasoning (gpt-oss-120b) tốn nhiều token suy nghĩ — cấp đủ để content không bị rỗng
      maxTokens: 8000,
      // Model free (OpenRouter) phản hồi chậm (~90-150s) — chặn 150s rồi bỏ qua, vẫn giữ trend từ Google
      timeoutMs: 150_000,
    });
    const arr = extractJsonArray(raw);
    if (!arr.length) {
      return { trends: [], error: "Model phản hồi trống hoặc không phải JSON hợp lệ — hãy đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa." };
    }
    const trends = arr
      .filter((t) => t && t.title)
      .map((t) => {
        const platform = String(t.platform || "TikTok").includes("Face") ? "Facebook" : "TikTok";
        const aiLink = typeof t.link === "string" && /^https?:\/\//i.test(t.link.trim()) ? t.link.trim().slice(0, 500) : "";
        return {
          title: String(t.title).slice(0, 200),
          platform,
          category: String(t.category || "Khác").slice(0, 50),
          views: Math.max(0, Math.round(Number(t.views) || 0)),
          growth: Number(t.growth) || 0,
          score: Math.min(100, Math.max(0, Math.round(Number(t.score) || 50))),
          source: "ai",
          recommendation: t.recommendation ? String(t.recommendation).slice(0, 300) : null,
          // Ưu tiên URL thật từ AI, luôn có fallback link tìm kiếm theo nền tảng
          link: aiLink || trendSearchLink(platform, String(t.title)),
        };
      });
    if (!trends.length) {
      return { trends: [], error: "Model không trả về trend hợp lệ — hãy thử lại hoặc đổi model trong Cài đặt → AI & Tự động hóa." };
    }
    return { trends, error: null };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const friendly = /timed?\s?out|TimeoutError/i.test(msg)
      ? "Model AI phản hồi quá chậm (>150s) — model free có thể đang quá tải. Đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa."
      : `AI lỗi: ${msg}`;
    return { trends: [], error: friendly };
  }
}

// GET — CHỈ trend của tôi (admin xem tất cả)
export async function GET() {
  const denied = await requirePermApi("trends");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);

  const trends = await prisma.trend.findMany({
    where: admin ? {} : { ownerId: uid },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, trends });
}

// POST — {refresh:true} thu thập (gán cho tôi) | dữ liệu trend = thêm thủ công của tôi
export async function POST(req: NextRequest) {
  const denied = await requirePermApi("trends_create");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  const body = await req.json().catch(() => ({}));

  if (body?.refresh) {
    let googleCount = 0;
    let aiCount = 0;
    let newsCount = 0;

    // 1) Google Trends — riêng của tôi, chỉ thêm title chưa có
    const googleTrends = await fetchGoogleTrends();
    if (googleTrends.length) {
      const existing = await prisma.trend.findMany({
        where: { source: "google-trends", ownerId: uid },
        select: { title: true },
      });
      const have = new Set(existing.map((e) => e.title.toLowerCase()));
      for (const t of googleTrends) {
        if (have.has(t.title.toLowerCase())) continue;
        await prisma.trend.create({ data: { ...t, ownerId: uid, note: null, link: null } as any });
        googleCount++;
      }
    }

    // 1b) TIN NÓNG BĐS từ Google News — chỉ thêm bài chưa có của tôi
    const news = await fetchGoogleNews();
    if (news.length) {
      const existingNews = await prisma.trend.findMany({
        where: { source: "google-news", ownerId: uid },
        select: { title: true },
      });
      const haveNews = new Set(existingNews.map((e) => e.title.toLowerCase()));
      for (const t of news) {
        if (haveNews.has(t.title.toLowerCase())) continue;
        await prisma.trend.create({ data: { ...t, ownerId: uid } as any });
        newsCount++;
      }
    }

    // 2) AI — thay trend AI CỦA TÔI bằng bộ mới
    const ai = await fetchAITrends();
    if (ai.trends.length) {
      await prisma.trend.deleteMany({ where: { source: "ai", ownerId: uid } });
      for (const t of ai.trends) {
        await prisma.trend.create({ data: { ...t, ownerId: uid } as any });
        aiCount++;
      }
    }

    try {
      await logActivity("trends", "create", "Thu thập trend: " + googleCount + " Google Trends, " + newsCount + " tin nóng, " + aiCount + " AI");
    } catch {}

    // Thông báo cho người thu thập khi có trend/tin mới (nếu bật notifyTrend trong Cài đặt)
    const newTrends = googleCount + aiCount + newsCount;
    if (newTrends > 0 && uid && (await notifyEnabled("notifyTrend"))) {
      await safeNotify({
        userId: uid,
        type: "trend",
        title: `🔥 Phát hiện ${newTrends} trend/tin mới`,
        content: `Google Trends: +${googleCount} • Tin nóng BĐS: +${newsCount} • AI gợi ý: +${aiCount} — mở tab Xu hướng để xem chi tiết.`,
        link: "/dashboard/trends",
      });
    }

    return NextResponse.json({
      ok: true,
      added: { google: googleCount, ai: aiCount, news: newsCount },
      aiEnabled: !!(await getAICfg()).key,
      // AI hỏng vẫn ok:true (giữ trend Google/tin nóng) nhưng báo lỗi để UI cảnh báo
      aiError: ai.error || null,
    });
  }

  // Thêm thủ công — của tôi
  const title = String(body?.title || "").trim();
  if (!title) return NextResponse.json({ ok: false, error: "Vui lòng nhập tên trend" }, { status: 400 });
  const trend = await prisma.trend.create({
    data: {
      title: title.slice(0, 200),
      platform: String(body?.platform || "TikTok").slice(0, 30),
      category: String(body?.category || "Khác").slice(0, 50),
      views: Math.max(0, Math.round(Number(body?.views) || 0)),
      growth: Number(body?.growth) || 0,
      score: Math.min(100, Math.max(0, Math.round(Number(body?.score) || 50))),
      source: "manual",
      recommendation: body?.recommendation ? String(body.recommendation).slice(0, 300) : null,
      link: body?.link ? String(body.link).slice(0, 500) : null,
      note: body?.note ? String(body.note).slice(0, 500) : null,
      ownerId: uid,
    },
  });
  try {
    await logActivity("trends", "create", "Thêm trend thủ công: " + title + " (" + (user?.name || "?") + ")");
  } catch {}
  return NextResponse.json({ ok: true, trend });
}

// PATCH — chỉ sửa trend CỦA TÔI (admin sửa được tất cả)
export async function PATCH(req: NextRequest) {
  const denied = await requirePermApi("trends_create");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

  const trend = await prisma.trend.findUnique({ where: { id } });
  if (!trend) return NextResponse.json({ ok: false, error: "Không tìm thấy trend" }, { status: 404 });
  if (!admin && trend.ownerId !== uid) {
    return NextResponse.json({ ok: false, error: "Chỉ được sửa trend của mình" }, { status: 403 });
  }

  const data: any = {};
  if (body.title !== undefined) data.title = String(body.title).slice(0, 200);
  if (body.platform !== undefined) data.platform = String(body.platform).slice(0, 30);
  if (body.category !== undefined) data.category = String(body.category).slice(0, 50);
  if (body.views !== undefined) data.views = Math.max(0, Math.round(Number(body.views) || 0));
  if (body.growth !== undefined) data.growth = Number(body.growth) || 0;
  if (body.score !== undefined) data.score = Math.min(100, Math.max(0, Math.round(Number(body.score) || 50)));
  if (body.note !== undefined) data.note = String(body.note).slice(0, 500);
  if (body.link !== undefined) data.link = body.link ? String(body.link).slice(0, 500) : null;
  if (body.recommendation !== undefined) data.recommendation = String(body.recommendation).slice(0, 300);
  const updated = await prisma.trend.update({ where: { id }, data });
  return NextResponse.json({ ok: true, trend: updated });
}

// DELETE — chỉ xoá trend CỦA TÔI (admin xoá được tất cả)
export async function DELETE(req: NextRequest) {
  const denied = await requirePermApi("trends_delete");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

  const trend = await prisma.trend.findUnique({ where: { id } });
  if (!trend) return NextResponse.json({ ok: false, error: "Không tìm thấy trend" }, { status: 404 });
  if (!admin && trend.ownerId !== uid) {
    return NextResponse.json({ ok: false, error: "Chỉ được xoá trend của mình" }, { status: 403 });
  }
  await prisma.trend.delete({ where: { id } });
  try {
    await logActivity("trends", "delete", "Xoá trend #" + id);
  } catch {}
  return NextResponse.json({ ok: true });
}
