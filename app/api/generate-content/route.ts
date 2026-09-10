import { NextRequest, NextResponse } from "next/server";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { getAICfg, callAIChat, type AICfg } from "@/lib/aiConfig";

function stripFences(raw: string) {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function extractJson(raw: string): any {
  const s = stripFences(raw);
  try { return JSON.parse(s); } catch {}
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i !== -1 && j !== -1 && j > i) {
    try { return JSON.parse(s.slice(i, j + 1)); } catch {}
  }
  return null;
}

async function callExternalAI(cfg: AICfg, prompt: string) {
  // Model reasoning (gpt-oss-120b) tốn nhiều token suy nghĩ — cấp đủ (4000) để content không bị rỗng
  const raw = await callAIChat(cfg, {
    system: "Bạn là trợ lý tạo nội dung marketing bất động sản. Luôn trả về JSON hợp lệ, không giải thích.",
    user: prompt,
    temperature: 0.8,
    maxTokens: 6000,
  });
  return extractJson(raw);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermApi("content_studio_create");
  if (denied) return denied;
  try {
    const body = await req.json();
    const title: string = (body.title || "").trim();
    const platform: string = body.platform || "TikTok";
    const tone: string = body.tone || "Chuyên gia";
    const length: string = body.length || "60 giây";
    const goal: string = body.goal || "Tăng lead";
    // Số người quay (1 = cá nhân tự nói; 2-4 = kịch bản thoại chia lời theo từng người)
    const people = Math.min(4, Math.max(1, Math.round(Number(body.people) || 1)));

    if (!title) {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập chủ đề / tiêu đề" }, { status: 400 });
    }

    // LUÔN dùng AI thật — KHÔNG fallback dữ liệu mẫu
    const cfg = await getAICfg();
    if (!cfg.key) {
      return NextResponse.json(
        { ok: false, error: "Chưa cấu hình AI. Hãy thêm GROQ_API_KEY vào .env hoặc Cài đặt hệ thống." },
        { status: 400 }
      );
    }

    // Kịch bản: 1 người = lời dẫn đơn; >=2 người = kịch bản thoại chia lời theo từng người, MỖI NGƯỜI 1 DÒNG
    const scriptRule =
      people === 1
        ? `"script": kịch bản video 1 người quay — chia theo [CẢNH 1], [CẢNH 2]... mỗi cảnh có lời dẫn + mô tả hành động/quay máy ngắn gọn.`
        : `"script": KỊCH BẢN THOẠI CHO ${people} NGƯỜI quay cùng khung hình — chia theo [CẢNH 1], [CẢNH 2]...; ở ĐẦU script liệt kê vai của từng người (Người 1: <vai> — Người ${people}: <vai>); mỗi dòng thoại ghi rõ người nói theo format "Người X (vai): lời thoại"; thoại tự nhiên, có qua lại giữa các người như hội thoại thật, mỗi người đều có thoại.`;
    const lineRule = `QUAN TRỌNG VỀ XUẤT DÒNG trong "script":\n- Mỗi câu thoại / mô tả quay máy nằm RIÊNG MỘT DÙNG (xuống dòng sau mỗi câu).\n- Giữa các [CẢNH] cách nhau 1 dòng trống.\n- Tuyệt đối không viết toàn bộ kịch bản trên một dòng liền.`;
    const prompt = `Bạn là chuyên gia marketing bất động sản. Viết content ${platform} bằng tiếng Việt về: "${title}".
Tone: ${tone}. Độ dài video: ${length}. Mục tiêu: ${goal}. Số người quay: ${people}.
Trả về CHỈ một JSON hợp lệ (không code block) với key: "hook","script","caption","hashtags" (mỗi key là chuỗi tiếng Việt). ${scriptRule} ${lineRule}`;

    let parsed: any = null;
    try {
      parsed = await callExternalAI(cfg, prompt);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: `Lỗi AI API: ${e?.message || String(e)}. Kiểm tra GROQ_API_KEY và AI_MODEL trong Cài đặt/.env.` },
        { status: 502 }
      );
    }

    if (!parsed || !parsed.hook) {
      return NextResponse.json(
        { ok: false, error: "AI không trả về nội dung hợp lệ, xin thử lại." },
        { status: 502 }
      );
    }

    // Chuẩn hoá xuống dòng cho kịch bản: \n literal từ model → xuống dòng thật;
    // tách câu "Người X (vai): ..." nếu model gộp nhiều câu trên 1 dòng
    const normalizeScript = (s: string) =>
      String(s ?? "")
        .replace(/\\n/g, "\n")
        .replace(/(?<!\n)(?=\bNgười \d+\s*\()/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return NextResponse.json({
      ok: true,
      provider: "groq",
      result: {
        hook: String(parsed.hook ?? ""),
        script: normalizeScript(String(parsed.script ?? "")),
        caption: String(parsed.caption ?? ""),
        hashtags: String(parsed.hashtags ?? ""),
        tone, platform, length, goal,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
