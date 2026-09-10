import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/guard";
import { getLogoUrl, getBotLogoUrl } from "@/lib/brandLogo";

export async function GET() {
    const denied = await requireAdminApi();
    if (denied) return denied;
    
    const settings = await prisma.setting.findMany();
    const getSetting = (key: string, defaultVal: string = "") => {
      const s = settings.find((x) => x.key === key);
      return s?.value || defaultVal;
    };
    const logoUrl = await getLogoUrl();
    const botLogoUrl = await getBotLogoUrl();

    // Key AI theo từng provider (aiKey_groq, aiKey_gemini, aiKey_deepseek...)
    const aiKeys: Record<string, string> = {};
    for (const s of settings) {
      if (s.key.startsWith("aiKey_")) aiKeys[s.key.slice(6)] = s.value || "";
    }

    return NextResponse.json({ 
      ok: true, 
      settings: {
        companyName: getSetting("companyName", "Tân Phú Land"),
        companyPhone: getSetting("companyPhone", ""),
        companyEmail: getSetting("companyEmail", ""),
        brandColor: getSetting("brandColor", "#1b98e0"),
        slogan: getSetting("slogan", ""),
        aiProvider: getSetting("aiProvider", "groq"),
        aiModel: getSetting("aiModel", "openai/gpt-oss-120b"),
        aiEndpoint: getSetting("aiEndpoint", ""),
        aiApiKey: getSetting("aiApiKey", ""),
        geminiApiKey: getSetting("geminiApiKey", ""),
        openaiApiKey: getSetting("openaiApiKey", ""),
        aiKeys,

        dbName: getSetting("dbName", ""),
        dbServer: getSetting("dbServer", ""),
        notifyLead: getSetting("notifyLead", "true") === "true",
        notifyTask: getSetting("notifyTask", "true") === "true",
        notifyReport: getSetting("notifyReport", "true") === "true",
        notifyTrend: getSetting("notifyTrend", "true") === "true",
        notifyContent: getSetting("notifyContent", "true") === "true",
        notifyViral: getSetting("notifyViral", "true") === "true",
        metaPixelId: getSetting("metaPixelId", ""),
        ga4Id: getSetting("ga4Id", ""),
        followUpDays: getSetting("followUpDays", "3"),
        autoReminders: getSetting("autoReminders", "true") === "true",
        weeklyReport: getSetting("weeklyReport", "true") === "true",
        cronSecret: getSetting("cronSecret", ""),
        logoUrl,
        assistantLogoUrl: botLogoUrl,
      }
    });
}

export async function PUT(req: NextRequest) {
    const denied = await requireAdminApi();
    if (denied) return denied;
    try {
        const body = await req.json();
        
        // Settings to update
        const settingKeys = [
          "companyName", "companyPhone", "companyEmail", "brandColor", "slogan",
          "aiProvider", "aiModel", "aiEndpoint", "aiApiKey", "geminiApiKey", "openaiApiKey",
          "dbName", "dbServer",
          "notifyLead", "notifyTask", "notifyReport", "notifyTrend", "notifyContent", "notifyViral",
          "metaPixelId", "ga4Id", "followUpDays", "autoReminders", "weeklyReport", "cronSecret"
        ];
        
        for (const key of settingKeys) {
          if (body[key] !== undefined) {
            const value = String(body[key]);
            const existing = await prisma.setting.findFirst({ where: { key } });
            if (existing) {
              await prisma.setting.update({ where: { id: existing.id }, data: { value } });
            } else {
              await prisma.setting.create({ data: { key, value } });
            }
        }
        }

        // Key AI theo từng provider: aiKey_groq, aiKey_gemini, aiKey_deepseek...
        if (body.aiKeys && typeof body.aiKeys === "object") {
          for (const [provider, value] of Object.entries(body.aiKeys)) {
            if (!/^[a-z0-9_-]+$/i.test(provider)) continue;
            const key = "aiKey_" + provider;
            const value2 = String(value ?? "");
            const existing = await prisma.setting.findFirst({ where: { key } });
            if (existing) {
              await prisma.setting.update({ where: { id: existing.id }, data: { value: value2 } });
            } else {
              await prisma.setting.create({ data: { key, value: value2 } });
            }
          }
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
