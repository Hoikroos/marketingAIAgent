import { NextRequest, NextResponse } from "next/server";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { buildContext } from "@/lib/assistant";
import { logActivity } from "@/lib/activity";
import { getAICfg } from "@/lib/aiConfig";

const SYSTEM_PROMPT = `Bạn là "TRỢ LÝ AI TÂN PHÚ LAND" — trợ lý marketing bất động sản của công ty Tân Phú Land (không phải sales — không nhắc đến chốt đơn/cọc).
Khi được hỏi bạn là ai, hãy tự giới thiệu: "Tôi là Trợ lý AI Tân Phú Land".

Bạn có 2 CHẾ ĐỘ TRẢ LỜI — tự nhận diện loại câu hỏi của người dùng:

【CHẾ ĐỘ 1 — Câu hỏi LIÊN QUAN DỮ LIỆU】 (leads/khách hàng, nội dung, quảng cáo, MXH, trend, KPI, hiệu suất, lịch đăng, báo cáo...):
- BẮT BUỘC dựa trên SỐ LIỆU THỰC trong phần "DỮ LIỆU HỆ THỐNG" bên dưới — trích số liệu CHÍNH XÁC, TUYỆT ĐỐI KHÔNG bịa số liệu không có.
- So sánh tuần này vs tuần trước khi có số.
- Đưa ra 2-4 HÀNH ĐỘNG cụ thể nên làm, mỗi hành động bắt đầu bằng dấu "•".
- Nếu dữ liệu thiếu, nói rõ cần nhập thêm ở chức năng nào.
- Độ dài tối đa ~250 từ, đi thẳng vào vấn đề.

【CHẾ ĐỘ 2 — Câu hỏi NGOÀI dữ liệu】 (chào hỏi "hi/hello/alo", cảm ơn, hỏi bạn là ai/ làm được gì, trò chuyện xã giao, hỏi kiến thức chung về marketing BĐS hoặc bất kỳ chủ đề nào khác...):
- Trả lời TỰ NHIÊN, THÂN THIỆN như một trợ lý AI thông minh — KHÔNG ép buộc bullet hành động, KHÔNG gượng ép nhắc số liệu khi không liên quan.
- Chào hỏi: đáp lại ngắn gọn vui vẻ + giới thiệu ngắn 1-2 việc bạn có thể giúp (phân tích số liệu marketing, gợi ý nội dung, tư vấn trend...).
- Kiến thức chung: trả lời chính xác theo hiểu biết của mình, dùng bullet khi thực sự hợp lý.
- Càng ngắn gọn càng tốt (vài câu là đủ).

QUY TẮC CHUNG (áp dụng cả 2 chế độ):
- CHỈ trả lời bằng TIẾNG VIỆT rõ ràng, mạch lạc. TUYỆT ĐỐI không dùng tiếng Anh hay bất kỳ ngôn ngữ nào khác trong câu trả lời.
- KHÔNG hiển thị quá trình suy nghĩ, phân tích nội bộ, hay bất kỳ đoạn "thinking/reasoning" nào — chỉ xuất PHẦN TRẢ LỜI CUỐI CÙNG.
- Nếu câu hỏi vừa có dữ liệu vừa ngoài dữ liệu → kết hợp cả 2 chế độ ở phần tương ứng.`;

function cleanAnswer(raw: string): string {
  let s = raw || "";
  // Bỏ khối suy nghĩ ĐÃ ĐÓNG thẻ (giữ phần trả lời phía sau)
  s = s.replace(/([\s\S]*?<\/think>)/gi, "");
  // Model đang suy nghĩ nhưng chưa có câu trả lời (thẻ <think> chưa đóng)
  if (/<think[\s>]/i.test(s)) s = "";
  s = s.replace(/<\/?thinking>|<\/?thought>|<\/?reasoning>/gi, "");
  return s.trim();
}

/** POST /api/assistant — STREAM (NDJSON): {delta} từng đoạn, {done, sessionId} khi xong */
export async function POST(req: NextRequest) {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;
  const user = await getApiUser();

  const body = await req.json().catch(() => ({}));
  const question = String(body?.question || "").trim().slice(0, 500);
  let sessionId = Number(body?.sessionId) || 0;
  // Đính kèm file/hình ảnh (đã upload qua /api/assistant/upload)
  const rawAtts: any[] = Array.isArray(body?.attachments) ? body.attachments : [];
  const attachments = rawAtts
    .slice(0, 5)
    .filter((a) => a && typeof a.url === "string" && /^\/(api\/files\/|uploads\/)chat\//.test(a.url))
    .map((a) => ({
      url: String(a.url),
      name: String(a.name || "file").slice(0, 120),
      type: a.type === "image" ? "image" : "file",
      size: Number(a.size) || 0,
    }));
  if (!question && attachments.length === 0) return NextResponse.json({ ok: false, error: "Vui lòng nhập câu hỏi" }, { status: 400 });

  // Ghi rõ tên file đính kèm cho model biết (nội dung file không gửi vào prompt)
  const attNote = attachments.length
    ? `\n[Người dùng đã đính kèm ${attachments.length} file: ${attachments.map((a) => a.name).join(", ")}]`
    : "";
  const effectiveQuestion = question || "(chỉ gửi file đính kèm)";

  // Cài đặt riêng của Trợ lý (Admin chỉnh qua nút Cài đặt AI trong khung chat)
  let assModel = "", assTemp = 0.5, assMax = 2000, assUseData = true, assKey = "", assEndpoint = "";
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ["assistantModel", "assistantTemperature", "assistantMaxTokens", "assistantUseData", "assistantKey", "assistantEndpoint"] } },
    });
    const g = (k: string) => rows.find((r) => r.key === k)?.value || "";
    assModel = g("assistantModel");
    assTemp = Math.min(1, Math.max(0, Number(g("assistantTemperature")) || 0.5));
    assMax = Math.min(8000, Math.max(200, Number(g("assistantMaxTokens")) || 2000));
    assUseData = g("assistantUseData") !== "false";
    assKey = g("assistantKey");
    assEndpoint = g("assistantEndpoint");
  } catch {}

  const cfg = await getAICfg();
  // Trợ lý được dùng key + endpoint RIÊNG (nếu Admin đã cấu hình) — cho phép
  // Trợ lý chạy trên provider khác với các tính năng còn lại của hệ thống.
  if (assKey) cfg.key = assKey;
  if (assEndpoint) cfg.baseUrl = assEndpoint.replace(/\/$/, "");
  if (!cfg.key) {
    return NextResponse.json({
      ok: false,
      error: "Chưa cấu hình AI — vào Cài đặt → AI & Tự động hóa để nhập API Key (Groq miễn phí hoặc Cline).",
    }, { status: 400 });
  }

  let context = "";
  if (assUseData) {
    try { context = await buildContext(); } catch {}
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      let full = "";
      try {
        const upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
          // Chặn treo vô hạn khi model free của OpenRouter chậm/đứng trong hàng chờ
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            model: assModel || cfg.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: assUseData
                ? `DỮ LIỆU HỆ THỐNG (thời điểm hiện tại):\n${context}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: ${effectiveQuestion}${attNote}`
                : `CÂU HỎI CỦA NGƯỜI DÙNG: ${effectiveQuestion}${attNote}` },
            ],
            temperature: assTemp,
            max_tokens: assMax,
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          let msg = `AI API lỗi HTTP ${upstream.status}`;
          try { const j = JSON.parse(t); msg = j?.error?.message || msg; } catch {}
          send({ error: msg });
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta: string = j?.choices?.[0]?.delta?.content || "";
              if (delta) { full += delta; send({ delta }); }
            } catch {}
          }
        }

        // Lưu vào hội thoại (tạo mới nếu sessionId rỗng)
        const answer = cleanAnswer(full)
          || "⚠️ Model phản hồi trống hoặc quá chậm. Hãy thử lại, hoặc đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa (vd: Groq · llama-3.3-70b-versatile).";
        try {
          const uid = Number(user?.id) || 0;
          if (uid > 0) {
            if (!sessionId) {
              const conv = await prisma.assistantConversation.create({
                data: { userId: uid, userName: user?.name || null, title: question.slice(0, 60) || attachments[0]?.name?.slice(0, 60) || "Cuộc trò chuyện mới" },
              });
              sessionId = conv.id;
            } else {
              const owned = await prisma.assistantConversation.findFirst({ where: { id: sessionId, userId: uid } });
              if (!owned) sessionId = 0;
            }
            if (sessionId) {
              await prisma.assistantMessage.create({ data: { sessionId, userId: uid, userName: user?.name || null, role: "user", content: effectiveQuestion.slice(0, 4000), attachments: attachments.length ? JSON.stringify(attachments) : null } });
              await prisma.assistantMessage.create({ data: { sessionId, userId: uid, userName: user?.name || null, role: "ai", content: answer.slice(0, 8000) } });
              await prisma.assistantConversation.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
            }
          }
          await logActivity("assistant", "create", `Hỏi AI: ${question.slice(0, 100)}`);
        } catch {}

        send({ done: true, sessionId });
      } catch (err: any) {
        const isTimeout = err?.name === "TimeoutError" || /timed?\s?out/i.test(String(err?.message || err));
        const msg = isTimeout
          ? "Model phản hồi quá lâu (>2 phút) — model free có thể đang quá tải. Hãy đổi model nhanh hơn trong Cài đặt → AI & Tự động hóa (vd: Groq · llama-3.3-70b-versatile)."
          : String(err?.message || err);
        try { send({ error: msg }); } catch {}
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
