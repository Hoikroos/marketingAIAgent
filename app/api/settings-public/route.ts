import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLogoUrl, getBotLogoUrl } from "@/lib/brandLogo";

/**
 * Endpoint CÔNG KHAI: chỉ trả các thông tin thương hiệu (không có secret)
 * dùng để render tên công ty / slogan / màu thương hiệu / logo ở giao diện.
 */
export async function GET() {
  const logoUrl = await getLogoUrl();
  const botLogoUrl = await getBotLogoUrl();
  
  // Get settings from key-value store
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string, defaultVal: string = "") => {
    const s = settings.find((x) => x.key === key);
    return s?.value || defaultVal;
  };

  return NextResponse.json({
    ok: true,
    settings: {
      companyName: getSetting("companyName", "Tân Phú Land"),
      companyPhone: getSetting("companyPhone", ""),
      companyEmail: getSetting("companyEmail", ""),
      slogan: getSetting("slogan", ""),
      brandColor: getSetting("brandColor", "#1b98e0"),
      logoUrl,
      assistantLogoUrl: botLogoUrl,
    },
  });
}