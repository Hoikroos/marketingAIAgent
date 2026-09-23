import { prisma } from "../lib/prisma";

(async () => {
  const contents = await prisma.content.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, title: true, platform: true, views: true, leads: true },
  });
  console.log("TIEU_DE_TRONG_DB:");
  for (const c of contents) {
    console.log(` #${c.id} [${c.platform}] views=${c.views} leads=${c.leads} | len=${c.title.length} | "${c.title}"`);
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error("LOI:", e);
  process.exit(1);
});