import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CalendarBoard from "@/components/CalendarBoard";
import { getContents, getCalendarEvents } from "@/components/db";

export default async function Calendar() {
  await requirePerm("calendar");
  // XEM CHUNG: lịch hiển thị nội dung + sự kiện của cả team
  const contents = await getContents(200);
  const events = await getCalendarEvents(300);
  const scheduled = contents
    .filter((c) => c.scheduledAt)
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      type: c.type,
      scheduledAt: c.scheduledAt as unknown as string,
      authorName: (c as any).author?.name || "",
      authorId: c.authorId,
    }));

  return (
    <PageShell
      title="Lịch nội dung"
      subtitle="Lập lịch nội dung + sự kiện ngoài, giao việc và theo dõi tiến độ xuất bản"
    >
      <CalendarBoard items={scheduled} events={events as any} />
    </PageShell>
  );
}
