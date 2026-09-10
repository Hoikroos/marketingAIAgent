import { NextRequest, NextResponse } from "next/server";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

// GET /api/ads - List ads (all users with ads permission can see all)
export async function GET(req: NextRequest) {
  const denied = await requirePermApi("ads");
  if (denied) return denied;
  const user = await getApiUser();
  
  if (!user || !user.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const status = url.searchParams.get("status");

  const where: any = {};
  // All users with ads permission can see all campaigns
  // If you want users to only see their own, uncomment the following:
  // if (user.role !== "Admin") {
  //   where.ownerId = Number(user.id);
  // }
  if (platform) where.platform = platform;
  if (status) where.status = status;

  try {
    const campaigns = await prisma.adCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true } } },
    });

    return NextResponse.json(campaigns);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi server" }, { status: 500 });
  }
}

// POST /api/ads - Create new ad campaign
export async function POST(req: NextRequest) {
  const denied = await requirePermApi("ads_create");
  if (denied) return denied;
  const user = await getApiUser();
  
  if (!user || !user.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await req.json();

  const campaign = await prisma.adCampaign.create({
    data: {
      name: body.name,
      platform: body.platform,
      objective: body.objective || "",
      status: body.status || "Đang chạy",
      dailyBudget: body.dailyBudget || 0,
      totalBudget: body.totalBudget || 0,
      spent: body.spent || 0,
      impressions: body.impressions || 0,
      reach: body.reach || 0,
      clicks: body.clicks || 0,
      conversions: body.conversions || 0,
      likes: body.likes || 0,
      comments: body.comments || 0,
      shares: body.shares || 0,
      videoViews: body.videoViews || 0,
      watchTime: body.watchTime || 0,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      notes: body.notes || null,
      ownerId: Number(user.id),
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}