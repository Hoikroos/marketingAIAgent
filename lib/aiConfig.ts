// ---------------------------------------------------------------------------
// Cấu hình AI dùng chung (trends / generate-content / assistant / ai-test)
// MỌI THỨ LẤY TỪ Cài đặt hệ thống (Settings) — đổi provider/model/key trong app
// là chạy ngay, KHÔNG cần sửa code. .env chỉ là fallback cuối cùng (Groq).
// ---------------------------------------------------------------------------

// Khớp với AI_PROVIDERS trong app/dashboard/settings/page.tsx
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  mistral: { baseUrl: "https://api.mistral.ai/v1", model: "mistral-large-latest" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-20241022" },
  cline: { baseUrl: "https://api.cline.bot/api/v1", model: "minimax/minimax-m2.5" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

export type AICfg = { key: string; baseUrl: string; model: string; provider: string };

export async function getAICfg(): Promise<AICfg> {
  const cfg: AICfg = { key: "", baseUrl: "", model: "", provider: "groq" };
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.setting.findMany();
    const map = new Map(rows.map((r) => [r.key, (r.value || "").trim()]));

    const provider = map.get("aiProvider") || "groq";
    const def = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.groq;
    cfg.provider = PROVIDER_DEFAULTS[provider] ? provider : "groq";

    // 1) Key theo provider đang chọn (lưu mới: aiKey_<provider>)
    cfg.key = map.get("aiKey_" + cfg.provider) || "";
    // 2) Key lưu kiểu cũ (tương thích ngược)
    if (!cfg.key) {
      if (cfg.provider === "gemini") cfg.key = map.get("geminiApiKey") || "";
      else if (cfg.provider === "openai") cfg.key = map.get("openaiApiKey") || "";
      else cfg.key = map.get("aiApiKey") || "";
    }
    // 3) Endpoint / Model: giá trị nhập tay trong Settings ưu tiên, trống = mặc định provider
    cfg.baseUrl = map.get("aiEndpoint") || "";
    cfg.model = map.get("aiModel") || "";
    // Endpoint là URL mặc định của provider KHÁC (do bản cũ lưu sẵn) → dùng mặc định đúng
    const knownDefaults = new Set(Object.values(PROVIDER_DEFAULTS).map((p) => p.baseUrl));
    if (cfg.baseUrl && knownDefaults.has(cfg.baseUrl) && cfg.baseUrl !== def.baseUrl) cfg.baseUrl = "";
    // Sửa endpoint Gemini cũ còn thiếu đuôi /openai (chưa tương thích OpenAI API)
    if (cfg.provider === "gemini" && /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/?$/.test(cfg.baseUrl)) {
      cfg.baseUrl = PROVIDER_DEFAULTS.gemini.baseUrl;
    }
    if (!cfg.baseUrl) cfg.baseUrl = def.baseUrl;
    if (!cfg.model) cfg.model = def.model;
  } catch {}

  // Fallback .env (chỉ khi Settings chưa có key — Groq)
  if (!cfg.key && process.env.GROQ_API_KEY) {
    cfg.key = process.env.GROQ_API_KEY.trim();
    cfg.provider = "groq";
    cfg.baseUrl = cfg.baseUrl || (process.env.AI_BASE_URL || "").trim().replace(/\/$/, "") || PROVIDER_DEFAULTS.groq.baseUrl;
    cfg.model = cfg.model || (process.env.AI_MODEL || "").trim() || PROVIDER_DEFAULTS.groq.model;
  }
  if (!cfg.baseUrl) cfg.baseUrl = PROVIDER_DEFAULTS.groq.baseUrl;
  if (!cfg.model) cfg.model = PROVIDER_DEFAULTS.groq.model;
  cfg.baseUrl = cfg.baseUrl.replace(/\/$/, "");
  return cfg;
}

/**
 * Gọi AI (OpenAI-compatible) trả về chuỗi content.
 * max_tokens mặc định 8000 vì model reasoning (vd openai/gpt-oss-120b trên Groq)
 * tốn nhiều token cho phần "suy nghĩ" — nếu cấp ít (<=1500) content sẽ bị RỖNG.
 */
export async function callAIChat(
  cfg: AICfg,
  opts: { system?: string; user: string; maxTokens?: number; temperature?: number; timeoutMs?: number }
): Promise<string> {
  const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: opts.system || "Bạn là trợ lý AI. Luôn trả về nội dung yêu cầu, không giải thích thêm." },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 8000,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    let msg = `HTTP ${r.status}`;
    try {
      const j = JSON.parse(t);
      msg = j?.error?.message || msg;
    } catch {}
    throw new Error(`AI API lỗi ${msg}`);
  }
  const data = await r.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}