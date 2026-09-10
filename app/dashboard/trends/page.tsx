import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import TrendsBoard from "@/components/TrendsBoard";
import { prisma } from "@/lib/prisma";

export default async function TrendsPage() {
  await requirePerm("trends");
  const rows = await prisma.trend.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  // Chuẩn hoá Date → string để truyền an toàn sang client component
  const trends = JSON.parse(JSON.stringify(rows));
  return (
    <PageShell title="Xu hướng BĐS" subtitle="Trend bất động sản trên TikTok, Facebook & Google — nguồn cảm hứng tạo content">
      <TrendsBoard initial={trends} />
    </PageShell>
  );
}