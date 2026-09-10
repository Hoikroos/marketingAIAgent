import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ ok: true, leads: [], contents: [] });

    const [leads, contents] = await Promise.all([
        prisma.lead.findMany({ where: { OR: [{ name: { contains: q } }, { phone: { contains: q } }] }, take: 5 }),
        prisma.content.findMany({ where: { title: { contains: q } }, take: 5 }),
    ]);

    return NextResponse.json({ ok: true, leads, contents });
}
