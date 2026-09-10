import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

/** Tách danh sách người được giao (lưu chuỗi, phân tách bằng " · ") */
function parseAssignees(v?: string | null): string[] {
  return (v || "").split(" · ").map((s) => s.trim()).filter(Boolean);
}

async function adminUserIds() {
    const users = await prisma.user.findMany({
        where: { active: true },
        select: { id: true, role: true, permissions: true },
    });
    return users
        .filter((u) => u.role === "Admin" || (() => { try { return (JSON.parse(u.permissions || "[]") || []).includes("*"); } catch { return false; } })())
        .map((u) => u.id);
}

/** Nhân viên chỉ xem được công việc của mình; Admin xem tất cả */
export async function GET() {
    const user = await getCurrentUser();
    const isAdmin = !!user && (canAccess(user, "users") || isAdminLike(user));
    const tasks = await prisma.task.findMany({ orderBy: { id: "desc" } });
    const filtered = isAdmin ? tasks : tasks.filter((t) => !user || parseAssignees(t.assignee).includes(user.name || ""));
    return NextResponse.json({ ok: true, tasks: filtered });
}

export async function POST(req: NextRequest) {
    const denied = await requirePermApi("team_create");
    if (denied) return denied;
    try {
        const body = await req.json();
        const { title, assignee, priority, deadline } = body;
        if (!title) return NextResponse.json({ ok: false, error: "Vui lòng nhập tên công việc" }, { status: 400 });

        const created = await prisma.task.create({
            data: {
                title: String(title),
                assignee: assignee ? String(assignee) : undefined,
                priority: priority ? String(priority) : "Trung bình",
                status: "Chờ thực hiện",
                deadline: deadline ? new Date(deadline) : undefined,
            },
        });

        // Thông báo RIÊNG cho từng người được giao việc
        if (assignee) {
            for (const nm of parseAssignees(String(assignee))) {
                try {
                    const assignUser = await prisma.user.findFirst({
                        where: { name: { equals: nm }, active: true },
                        select: { id: true },
                    });
                    if (assignUser) {
                        await prisma.notification.create({
                            data: { userId: assignUser.id, type: "task", title: "Bạn được giao công việc", content: String(title), refId: created.id },
                        });
                    }
                } catch {}
            }
        }

        await logActivity("tasks", "create", `Giao việc "${String(title)}" cho ${assignee ? String(assignee) : "chưa gán"}`);
        return NextResponse.json({ ok: true, task: created });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const id = body.id ? Number(body.id) : null;
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return NextResponse.json({ ok: false, error: "Không tìm thấy công việc" }, { status: 404 });

        const current = await getCurrentUser();
        if (!current) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

        const isAdmin = canAccess(current, "users") || isAdminLike(current);
        const isAssignee = parseAssignees(task.assignee).includes(current.name || "");
        const canEditTask = isAdmin || canAccess(current, "team_update");
        // Nhân viên chỉ được đổi TRẠNG THÁI công việc của MÌNH (được giao);
        // sửa tiêu đề/người giao/ưu tiên/deadline cần quyền "Sửa" (team_update) hoặc Admin.
        if (!canEditTask && !isAssignee) {
            return NextResponse.json({ ok: false, error: "Chỉ người được giao việc (đổi trạng thái) hoặc người có quyền Sửa mới cập nhật được" }, { status: 403 });
        }

        const data: any = {};
        if (body.status) data.status = String(body.status);
        if (canEditTask) {
            if (body.title !== undefined) data.title = String(body.title);
            if (body.assignee !== undefined) data.assignee = body.assignee ? String(body.assignee) : null;
            if (body.priority !== undefined) data.priority = String(body.priority);
            if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
        } else if (Object.keys(body).some((k) => k !== "id" && k !== "status")) {
            return NextResponse.json({ ok: false, error: "Nhân viên chỉ được cập nhật trạng thái công việc của mình" }, { status: 403 });
        }
        if (Object.keys(data).length === 0) {
            return NextResponse.json({ ok: false, error: "Không có gì để cập nhật" }, { status: 400 });
        }

        const updated = await prisma.task.update({ where: { id }, data });

        // Nhân viên cập nhật trạng thái → báo cho tất cả admin
        try {
            if (current && !(canAccess(current, "users") || isAdminLike(current))) {
                const admins = await adminUserIds();
                for (const aid of admins) {
                    await prisma.notification.create({
                        data: { userId: aid, type: "task", title: "Công việc đã được cập nhật", content: `"${updated.title}" → ${String(updated.status)}`, refId: updated.id },
                    });
                }
            }
        } catch {}

        await logActivity("tasks", "update", `Cập nhật công việc "${updated.title}" → "${String(updated.status)}"`);
        return NextResponse.json({ ok: true, task: updated });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

/** Chỉ Admin mới xoá công việc được */
export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
    if (!(canAccess(user, "users") || isAdminLike(user) || canAccess(user, "team_delete"))) {
        return NextResponse.json({ ok: false, error: "Bạn không có quyền xoá công việc (cần quyền Xoá công việc trong Cộng tác nhóm)" }, { status: 403 });
    }
    try {
        const { searchParams } = new URL(req.url);
        const id = Number(searchParams.get("id"));
        if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
        const item = await prisma.task.findUnique({ where: { id } });
        await prisma.task.delete({ where: { id } });
        await logActivity("tasks", "delete", `Xoá công việc "${item?.title || `#${id}`}"`);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
