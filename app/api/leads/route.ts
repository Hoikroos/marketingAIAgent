import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { logActivity } from "@/lib/activity";

export async function GET() {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, leads });
}

export async function POST(req: NextRequest) {
    const denied = await requirePermApi("leads_create");
    if (denied) return denied;
    try {
        const body = await req.json();
        const { name, phone, source, address, purpose, contacted, responseStatus } = body;
        if (!name) return NextResponse.json({ ok: false, error: "Vui lòng nhập họ tên" }, { status: 400 });

        const created = await prisma.lead.create({
            data: {
                name: String(name),
                phone: phone ? String(phone) : "",
                source: source ? String(source) : "Website",
                address: address ? String(address) : undefined,
                purpose: purpose ? String(purpose) : undefined,
                contacted: contacted ? String(contacted) : "Chưa liên hệ",
                responseStatus: responseStatus ? String(responseStatus) : "Đang chờ khách phản hồi",
                utmSource: body.utmSource ? String(body.utmSource).slice(0, 100) : undefined,
                utmMedium: body.utmMedium ? String(body.utmMedium).slice(0, 100) : undefined,
                utmCampaign: body.utmCampaign ? String(body.utmCampaign).slice(0, 100) : undefined,
                utmContent: body.utmContent ? String(body.utmContent).slice(0, 200) : undefined,
            },
        });

        await logActivity("leads", "create", `Tạo lead "${String(name)}" (${String(phone)})`);
        return NextResponse.json({ ok: true, lead: created });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const denied = await requirePermApi("leads_update");
    if (denied) return denied;
    try {
        const body = await req.json();
        const { id, status, name, phone, source, address, purpose, contacted, responseStatus } = body;
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

        const data: any = {};
        if (status) data.status = String(status);
        if (name !== undefined) data.name = String(name);
        if (phone !== undefined) data.phone = String(phone);
        if (source !== undefined) data.source = String(source);
        if (address !== undefined) data.address = String(address);
        if (purpose !== undefined) data.purpose = String(purpose);
        if (contacted !== undefined) data.contacted = contacted ? String(contacted) : "Chưa liên hệ";
        if (responseStatus !== undefined) data.responseStatus = responseStatus ? String(responseStatus) : "Đang chờ khách phản hồi";
        if (body.utmSource !== undefined) data.utmSource = body.utmSource ? String(body.utmSource).slice(0, 100) : null;
        if (body.utmMedium !== undefined) data.utmMedium = body.utmMedium ? String(body.utmMedium).slice(0, 100) : null;
        if (body.utmCampaign !== undefined) data.utmCampaign = body.utmCampaign ? String(body.utmCampaign).slice(0, 100) : null;
        if (body.utmContent !== undefined) data.utmContent = body.utmContent ? String(body.utmContent).slice(0, 200) : null;

        const current = await prisma.lead.findUnique({ where: { id: Number(id) } });
        const updated = await prisma.lead.update({ where: { id: Number(id) }, data });
        await logActivity("leads", "update", `Cập nhật lead "${current?.name || `#${id}`}"`, );

        return NextResponse.json({ ok: true, lead: updated });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const denied = await requirePermApi("leads_delete");
    if (denied) return denied;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
        const item = await prisma.lead.findUnique({ where: { id: Number(id) } });
        await prisma.lead.delete({ where: { id: Number(id) } });
        await logActivity("leads", "delete", `Xoá lead "${item?.name || `#${id}`}" (${item?.phone || ""})`);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
