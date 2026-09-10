import { requirePerm } from "@/lib/guard";
import { Suspense } from "react";
import PageShell from "@/components/page-shell";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskStatusSelect from "@/components/TaskStatusSelect";
import EditTaskModal from "@/components/EditTaskModal";
import TeamTaskFocus from "@/components/TeamTaskFocus";
import UrlFilters from "@/components/UrlFilters";
import { labelDefOf } from "@/components/TaskLabels";
import { User } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { getTasks, getAssigneeUsers } from "@/components/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";

const TASK_TONE: Record<string, string> = {
  "Chờ thực hiện": "bg-rose-500/15 text-rose-400",     // đỏ
  "Đang thực hiện": "bg-orange-500/15 text-orange-400", // cam
  "Đã hoàn thành": "bg-emerald-500/15 text-emerald-400", // xanh lá
};

const PRIORITY_TONE: Record<string, string> = {
  "Cao": "bg-rose-500/15 text-rose-400",
  "Trung bình": "bg-amber-500/15 text-amber-400",
  "Thấp": "bg-slate-500/15 text-slate-400",
};

/** Các cột Kanban theo trạng thái (giống Trello) */
const COLUMNS = [
  { status: "Chờ thực hiện", dot: "bg-rose-400" },
  { status: "Đang thực hiện", dot: "bg-orange-400" },
  { status: "Đã hoàn thành", dot: "bg-emerald-400" },
];

export default async function Team({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; priority?: string };
}) {
  await requirePerm("team");
  const user = await getCurrentUser();
  const isAdmin = !!user && (canAccess(user, "users") || isAdminLike(user));
  const canEdit = isAdmin || (!!user && canAccess(user, "team_update")); // quyền Sửa
  const canDelete = isAdmin || (!!user && canAccess(user, "team_delete")); // quyền Xoá (cấp trong Phân quyền)
  const [tasks, users] = await Promise.all([getTasks(200), getAssigneeUsers()]);
  const names = users.map((u) => u.name);
  const avatarByName = new Map(users.map((u) => [u.name, (u as any).avatar as string | null | undefined]));
  const myName = user?.name;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ===== Lọc theo query params (UrlFilters) =====
  const q = (searchParams.q || "").trim().toLowerCase();
  const fStatus = searchParams.status || "";
  const fPriority = searchParams.priority || "";
  const filteredTasks = tasks.filter((t) => {
    if (fStatus && t.status !== fStatus) return false;
    if (fPriority && t.priority !== fPriority) return false;
    if (q && !`${t.title} ${t.assignee || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <PageShell title="Cộng tác nhóm" subtitle="Giao việc, duyệt content và phối hợp đội Marketing">
      <Suspense fallback={null}>
        <TeamTaskFocus />
      </Suspense>
      <Suspense fallback={null}>
        <UrlFilters
          placeholder="Tìm theo tên công việc, người giao..."
          defs={[
            { key: "status", label: "trạng thái", options: ["", "Chờ thực hiện", "Đang thực hiện", "Đã hoàn thành"] },
            { key: "priority", label: "ưu tiên", options: ["", "Cao", "Trung bình", "Thấp"] },
          ]}
        />
      </Suspense>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[11px] text-slate-400">
          {filteredTasks.length} công việc {canEdit && "• bạn có quyền sửa/giao việc"}
        </div>
        <CreateTaskModal users={names} />
      </div>
      {filteredTasks.length === 0 ? (
        <EmptyState title="Không có công việc nào phù hợp" desc="Thử đổi bộ lọc hoặc giao việc mới cho đội ngũ." />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {COLUMNS.map((col) => {
            const cards = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="w-72 shrink-0 rounded-xl bg-[var(--panel2)]/60 border border-[var(--border)] p-2 min-h-[150px]"
              >
                <div className="flex items-center gap-2 px-1.5 py-1.5 mb-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <span className="text-xs font-bold">{col.status}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((t) => {
                    const assignees = (t.assignee || "").split(" · ").map((s) => s.trim()).filter(Boolean);
                    // Chỉ người được giao việc (được nhắc tên trong cột "Giao cho") mới đổi được trạng thái;
                    // Admin thì đổi được trạng thái mọi công việc.
                    const canEditStatus = isAdmin || (!!myName && assignees.includes(myName));
                    const deadlineDate = t.deadline ? new Date(t.deadline) : null;
                    const isOverdue = !!deadlineDate && deadlineDate < todayStart && t.status !== "Đã hoàn thành";
                    const deadlineDateStr = deadlineDate ? deadlineDate.toLocaleDateString("vi-VN") : "";

                    return (
                      <div
                        key={t.id}
                        id={`task-row-${t.id}`}
                        className="rounded-lg bg-[var(--panel)] border border-[var(--border)] p-2.5 scroll-mt-24 shadow-sm hover:border-[#1b98e0]/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold leading-snug">{t.title}</span>
                          {(canEdit || canDelete) && (
                            <span className="shrink-0">
                              <EditTaskModal task={t as any} users={names} canEdit={canEdit} canDelete={canDelete} />
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {assignees.length ? (
                            assignees.map((name) => (
                              <span key={name} className="flex items-center gap-1 bg-[var(--panel2)] border border-[var(--border)] rounded-full pl-1 pr-2 py-0.5">
                                {(() => {
                                  const av = avatarByName.get(name);
                                  return av ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={av} alt={name} className="h-5 w-5 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <span className="h-5 w-5 rounded-full bg-[#1b98e0] grid place-items-center text-white shrink-0">
                                      <User size={11} />
                                    </span>
                                  );
                                })()}
                                <span className="text-[10px]">{name}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[10px]">—</span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_TONE[t.priority] || "bg-slate-500/15 text-slate-400"}`}>
                            {t.priority}
                          </span>
                          <span className="text-[10px] text-slate-500 text-right leading-snug">
                            {deadlineDateStr && (
                              <span className={isOverdue ? "text-rose-400 font-semibold" : ""}>
                                {isOverdue ? "Quá hạn • " : ""}Hạn {deadlineDateStr}
                              </span>
                            )}
                            {!deadlineDateStr && <span className="text-slate-600">—</span>}
                          </span>
                        </div>

                        <div className="mt-2">
                          {canEditStatus ? (
                            <TaskStatusSelect id={t.id} status={t.status} />
                          ) : (
                            <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-bold ${TASK_TONE[t.status] || "bg-slate-500/15 text-slate-400"}`}>
                              {t.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="text-[11px] text-slate-500 text-center py-4 border border-dashed border-[var(--border)] rounded-lg">
                      Trống
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}