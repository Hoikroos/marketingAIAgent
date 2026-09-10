import { prisma } from "@/lib/prisma";

/** Đọc Meta Pixel ID + GA4 Measurement ID từ Settings (hàng key/value) */
export async function getTrackingIds(): Promise<{ pixelId: string; gaId: string }> {
  let pixelId = "";
  let gaId = "";
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ["metaPixelId", "ga4Id"] } } });
    for (const r of rows) {
      if (r.key === "metaPixelId") pixelId = (r.value || "").trim();
      if (r.key === "ga4Id") gaId = (r.value || "").trim();
    }
  } catch {}
  return { pixelId, gaId };
}