import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notifyEnabled, broadcastNotify } from "@/lib/notify";

/** GET — XEM CHUNG: trả toàn bộ nội dung của team (sửa/xoá vẫn chỉ tác giả hoặc admin) */
export async function GET() {
    const contents = await prisma.content.findMany({
        orderBy: { createdAt: "desc" },
        include: { author: true },
    });
    return NextResponse.json({ ok: true, contents });
}

export async function POST(req: NextRequest) {
    const denied = await requirePermApi("content_create");
    if (denied) return denied;
    const user = await getApiUser();
    const uid = Number(user?.id) || 0;
    try {
        const body = await req.json();
        const { title, platform, type, scheduledAt, script, caption, hashtags, tone } = body;
        if (!title || !platform) return NextResponse.json({ ok: false, error: "Vui lòng nhập tiêu đề và nền tảng" }, { status: 400 });

        const created = await prisma.content.create({
            data: {
                title: String(title),
                platform: String(platform),
                type: type ? String(type) : "",
                // LUÔN gán tác giả = người đang đăng nhập (ai tạo của người đó, không nhận authorId từ client)
                authorId: uid || undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                script: script ? String(script) : undefined,
                caption: caption ? String(caption) : undefined,
                hashtags: hashtags ? String(hashtags) : undefined,
                tone: tone ? String(tone) : undefined,
            },
        });

        // Thông báo CHUNG cho cả team khi có nội dung mới (nếu bật notifyContent trong Cài đặt)
        if (await notifyEnabled("notifyContent")) {
            await broadcastNotify({
                type: "content",
                title: `🆕 Nội dung mới: "${String(title)}"`,
                content: `${String(platform)}${type ? " • " + String(type) : ""} — do ${user?.name || "thành viên"} tạo`,
                link: "/dashboard/content",
                refId: created.id,
            });
        }

        await logActivity("content", "create", `Tạo nội dung "${String(title)}" (${String(platform)})`);
        return NextResponse.json({ ok: true, content: created });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const denied = await requirePermApi("content_update");
    if (denied) return denied;
    const user = await getApiUser();
    const uid = Number(user?.id) || 0;
    const admin = !!user && isAdminLike(user);
    try {
        const body = await req.json();
        const id = body.id ? Number(body.id) : null;
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

        // Chỉ tác giả hoặc admin được sửa
        const existing = await prisma.content.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ ok: false, error: "Không tìm thấy nội dung" }, { status: 404 });
        if (!admin && existing.authorId !== uid) {
            return NextResponse.json({ ok: false, error: "Chỉ được sửa nội dung của mình" }, { status: 403 });
        }

        const data: any = {};
        if (body.title !== undefined) data.title = String(body.title);
        if (body.platform !== undefined) data.platform = String(body.platform);
        if (body.type !== undefined) data.type = String(body.type);
        if (body.script !== undefined) data.script = body.script ? String(body.script) : null;
        if (body.caption !== undefined) data.caption = body.caption ? String(body.caption) : null;
        if (body.hashtags !== undefined) data.hashtags = body.hashtags ? String(body.hashtags) : null;
        if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
        if (Object.keys(data).length === 0) {
            return NextResponse.json({ ok: false, error: "Không có gì để cập nhật" }, { status: 400 });
        }

        const updated = await prisma.content.update({ where: { id }, data });
        await logActivity("content", "update", `Cập nhật nội dung "${updated.title}" (#${id})`);
        return NextResponse.json({ ok: true, content: updated });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const denied = await requirePermApi("content_delete");
    if (denied) return denied;
    const user = await getApiUser();
    const uid = Number(user?.id) || 0;
    const admin = !!user && isAdminLike(user);
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

        // Chỉ tác giả hoặc admin được xoá
        const existing = await prisma.content.findUnique({ where: { id: Number(id) } });
        if (!existing) return NextResponse.json({ ok: false, error: "Không tìm thấy nội dung" }, { status: 404 });
        if (!admin && existing.authorId !== uid) {
            return NextResponse.json({ ok: false, error: "Chỉ được xoá nội dung của mình" }, { status: 403 });
        }

        await prisma.content.delete({ where: { id: Number(id) } });
        await logActivity("content", "delete", `Xoá nội dung "${existing?.title || `#${id}`}"`);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
