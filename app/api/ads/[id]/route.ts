import { NextRequest, NextResponse } from "next/server";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermApi("ads");
  if (denied) return denied;
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const id = parseInt(params.id);
  const campaign = await prisma.adCampaign.findUnique({ where: { id }, include: { owner: { select: { id: true, name: true } } } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user?.role !== "Admin" && campaign.ownerId !== Number(user?.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermApi("ads_update");
  if (denied) return denied;
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const id = parseInt(params.id);
  const body = await req.json();
  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user?.role !== "Admin" && existing.ownerId !== Number(user?.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      platform: body.platform ?? existing.platform,
      objective: body.objective ?? existing.objective,
      status: body.status ?? existing.status,
      dailyBudget: body.dailyBudget ?? existing.dailyBudget,
      totalBudget: body.totalBudget ?? existing.totalBudget,
      spent: body.spent ?? existing.spent,
      impressions: body.impressions ?? existing.impressions,
      reach: body.reach ?? existing.reach,
      clicks: body.clicks ?? existing.clicks,
      conversions: body.conversions ?? existing.conversions,
      likes: body.likes ?? existing.likes,
      comments: body.comments ?? existing.comments,
      shares: body.shares ?? existing.shares,
      videoViews: body.videoViews ?? existing.videoViews,
      watchTime: body.watchTime ?? existing.watchTime,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      notes: body.notes ?? existing.notes,
    },
  });
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermApi("ads_delete");
  if (denied) return denied;
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const id = parseInt(params.id);
  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user?.role !== "Admin" && existing.ownerId !== Number(user?.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.adCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}