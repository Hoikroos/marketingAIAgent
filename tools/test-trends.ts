import { prisma } from "../lib/prisma";

const RE_KEYWORDS = [
  "nhà", "đất", "bất động sản", "bđs", "căn hộ", "chung cư", "bán nhà", "cho thuê",
  "sổ đỏ", "sổ hồng", "vay", "ngân hàng", "lãi suất", "phòng trọ", "mua", "nhà đất",
  "đất nền", "khu đô thị", "dự án", "real estate", "apartment", "housing", "land",
];

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

async function testGoogleTrends() {
  const out: string[] = [];
  try {
    const r = await fetch("https://trends.google.com/trending/rss?geo=VN", {
      headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    console.log("GOOGLE_TRENDS_HTTP:", r.status);
    if (!r.ok) return;
    const xml = await r.text();
    const chunks = xml.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
    console.log("GOOGLE_TRENDS_TOTAL_ITEMS:", chunks.length);
    for (const chunk of chunks) {
      const rawTitle = /<title>(.*?)<\/title>/.exec(chunk)?.[1] || "";
      const title = decodeXml(rawTitle);
      if (!title) continue;
      const low = title.toLowerCase();
      const hit = RE_KEYWORDS.some((k) => low.includes(k));
      if (hit) out.push(title);
    }
    console.log("GOOGLE_TRENDS_BDS_MATCH:", out.length, JSON.stringify(out.slice(0, 5)));
  } catch (e: any) {
    console.log("GOOGLE_TRENDS_LOI:", String(e?.message || e));
  }
}

const NEWS_QUERIES = [
  "bất động sản", "thị trường bất động sản", "giá đất", "chung cư",
  "đất nền", "cho thuê nhà đất", "sổ đỏ sổ hồng", "lãi suất vay mua nhà",
];

async function testGoogleNews() {
  let total = 0;
  for (const q of NEWS_QUERIES) {
    try {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=vi&gl=VN&ceid=VN:vi";
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
      console.log("NEWS [" + q + "] HTTP:", r.status);
      if (!r.ok) continue;
      const xml = await r.text();
      const items = xml.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
      console.log("NEWS [" + q + "] items:", items.length);
      total += items.length;
    } catch (e: any) {
      console.log("NEWS [" + q + "] LOI:", String(e?.message || e));
    }
  }
  console.log("NEWS_TOTAL_ITEMS:", total);
}

(async () => {
  await testGoogleTrends();
  await testGoogleNews();
  await prisma.$disconnect();
})().catch((e) => { console.error("LOI:", e); process.exit(1); });