import { requirePerm } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdsClient from "@/components/AdsClient";
import DashboardLayout from "@/components/layout";

export default async function AdsPage() {
  await requirePerm("ads");
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const campaigns = await prisma.adCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, name: true } } },
  });

  // Calculate statistics
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c: any) => c.status === "Đang chạy").length,
    totalSpent: campaigns.reduce((sum: number, c: any) => sum + (c.spent || 0), 0),
    totalImpressions: campaigns.reduce((sum: number, c: any) => sum + (c.impressions || 0), 0),
    totalClicks: campaigns.reduce((sum: number, c: any) => sum + (c.clicks || 0), 0),
    totalConversions: campaigns.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0),
    totalReach: campaigns.reduce((sum: number, c: any) => sum + (c.reach || 0), 0),
    totalLikes: campaigns.reduce((sum: number, c: any) => sum + (c.likes || 0), 0),
    totalComments: campaigns.reduce((sum: number, c: any) => sum + (c.comments || 0), 0),
    totalShares: campaigns.reduce((sum: number, c: any) => sum + (c.shares || 0), 0),
    totalVideoViews: campaigns.reduce((sum: number, c: any) => sum + (c.videoViews || 0), 0),
    facebookCampaigns: campaigns.filter((c: any) => c.platform === "Facebook").length,
    tiktokCampaigns: campaigns.filter((c: any) => c.platform === "TikTok").length,
  };

  return (
    <DashboardLayout
      title="Chạy quảng cáo"
      subtitle="Quản lý chiến dịch Facebook & TikTok"
    >
      <AdsClient
        campaigns={JSON.parse(JSON.stringify(campaigns))}
        stats={stats}
        isAdmin={user?.role === "Admin"}
        userId={user?.id}
      />
    </DashboardLayout>
  );
}