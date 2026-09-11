import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, requirePermApi, getApiUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

/**
 * Cài đặt riêng cho Trợ lý AI (lưu bảng Setting dạng key/value):
 * - assistantModel      : model AI riêng của Trợ lý (rỗng = dùng model hệ thống)
 * - assistantTemperature: mức sáng tạo 0 → 1 (mặc định 0.5)
 * - assistantMaxTokens  : độ dài câu trả lời tối đa (mặc định 2000)
 * - assistantUseData    : "true"/"false" — có đọc số liệu hệ thống vào prompt hay không
 * - assistantKey        : API key RIÊNG của Trợ lý (rỗng = dùng key hệ thống) — GET chỉ trả
 *                         dạng che (••••1234), không bao giờ trả nguyên văn
 * - assistantEndpoint   : endpoint API riêng (rỗng = dùng endpoint hệ thống)
 */

const SETTING_KEYS = ["assistantModel", "assistantTemperature", "assistantMaxTokens", "assistantUseData", "assistantKey", "assistantEndpoint"];

const DEFAULTS = { model: "", temperature: 0.5, maxTokens: 2000, useData: true };

function maskKey(key: string) {
  return key ? `••••••${key.slice(-4)}` : "";
}

async function readSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value || "";
  const key = get("assistantKey");
  return {
    model: get("assistantModel"),
    temperature: Math.min(1, Math.max(0, Number(get("assistantTemperature")) || DEFAULTS.temperature)),
    maxTokens: Math.min(8000, Math.max(200, Number(get("assistantMaxTokens")) || DEFAULTS.maxTokens)),
    useData: get("assistantUseData") !== "false",
    key,
    endpoint: get("assistantEndpoint"),
  };
}

/** GET — người dùng có quyền Trợ lý đều đọc được (để UI biết cấu hình hiện tại) */
export async function GET() {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;
  const user = await getApiUser();
  const s = await readSettings();
  return NextResponse.json({
    ok: true,
    canEdit: !!user && isAdminLike(user),
    settings: {
      model: s.model,
      temperature: s.temperature,
      maxTokens: s.maxTokens,
      useData: s.useData,
      endpoint: s.endpoint,
      keyMasked: maskKey(s.key),
      hasKey: !!s.key,
    },
  });
}

/** PUT — chỉ Admin được sửa cài đặt Trợ lý.
 *  key: "" / thiếu = GIỮ NGUYÊN key cũ; "-" = XOÁ key riêng (dùng lại key hệ thống); khác = đặt key mới. */
export async function PUT(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const model = String(body?.model || "").trim().slice(0, 120);
  const temperature = Math.min(1, Math.max(0, Number(body?.temperature) || DEFAULTS.temperature));
  const maxTokens = Math.min(8000, Math.max(200, Number(body?.maxTokens) || DEFAULTS.maxTokens));
  const useData = body?.useData !== false;
  const endpoint = String(body?.endpoint || "").trim().slice(0, 300).replace(/\/$/, "");

  const current = await readSettings();
  let newKey = current.key;
  if (body?.key === "-") newKey = "";
  else if (typeof body?.key === "string" && body.key.trim()) newKey = body.key.trim();

  const entries: [string, string][] = [
    ["assistantModel", model],
    ["assistantTemperature", String(temperature)],
    ["assistantMaxTokens", String(maxTokens)],
    ["assistantUseData", useData ? "true" : "false"],
    ["assistantKey", newKey],
    ["assistantEndpoint", endpoint],
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  await logActivity("assistant", `Cập nhật cài đặt Trợ lý AI (model=${model || "mặc định"}, temp=${temperature}, maxTokens=${maxTokens}, dữ liệu hệ thống=${useData ? "bật" : "tắt"}, key riêng=${newKey ? "có" : "không"}, endpoint riêng=${endpoint ? "có" : "không"})`);

  return NextResponse.json({
    ok: true,
    settings: {
      model,
      temperature,
      maxTokens,
      useData,
      endpoint,
      keyMasked: maskKey(newKey),
      hasKey: !!newKey,
    },
  });
}
