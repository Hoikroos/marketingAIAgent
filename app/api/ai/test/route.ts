import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/guard";
import { getAICfg, callAIChat } from "@/lib/aiConfig";

/**
 * POST /api/ai/test — Admin bấm "Kiểm tra kết nối" trong Cài đặt.
 * Dùng ĐÚNG provider/model/key/endpoint đang lưu trong Settings (giống app thực tế).
 * Trả về { ok, provider, model, endpoint, latencyMs, reply } hoặc lỗi rõ ràng.
 */
export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const cfg = await getAICfg();
  if (!cfg.key) {
    return NextResponse.json({
      ok: false,
      provider: cfg.provider,
      model: cfg.model,
      endpoint: cfg.baseUrl,
      error: "Chưa có API Key cho nhà cung cấp này. Hãy nhập key rồi LƯU cấu hình trước khi kiểm tra.",
    }, { status: 400 });
  }

  const started = Date.now();
  try {
    const reply = await callAIChat(cfg, {
      system: "Bạn là máy kiểm tra kết nối. Chỉ trả về đúng một chữ: OK",
      user: "Kiểm tra kết nối. Trả về: OK",
      temperature: 0,
      maxTokens: 2000, // đủ cho model reasoning (phần suy nghĩ tốn token)
      timeoutMs: 45_000,
    });
    return NextResponse.json({
      ok: true,
      provider: cfg.provider,
      model: cfg.model,
      endpoint: cfg.baseUrl,
      latencyMs: Date.now() - started,
      reply: (reply || "").trim().slice(0, 100) || "(rỗng)",
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      provider: cfg.provider,
      model: cfg.model,
      endpoint: cfg.baseUrl,
      latencyMs: Date.now() - started,
      error: String(err?.message || err),
    }, { status: 502 });
  }
}
