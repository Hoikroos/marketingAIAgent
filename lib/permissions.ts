// ---------------------------------------------------------------------------
// Quyền truy cập theo CHỨC NĂNG + THAO TÁC (CRUD): module_action
//   vd: content (xem), content_create (thêm), content_update (sửa), content_delete (xoá)
// Admin có quyền "*" (toàn bộ).
//
// Mỗi nhóm chức năng có 1 icon (tên icon trong "./icons") để UI gán quyền
// hiển thị trực quan hơn — dùng chung bộ icon với Sidebar để nhất quán.
// ---------------------------------------------------------------------------

export const ADMIN_ROLE = "Admin";
export const WILDCARD = "*";

export type PermissionDef = { key: string; label: string };
export type PermissionGroup = { module: string; label: string; icon: string; actions: PermissionDef[] };

function withActions(
  module: string,
  label: string,
  icon: string,
  actions: { a: string; l: string }[]
): PermissionGroup {
  return {
    module,
    label,
    icon,
    // "view" giữ key = tên module (vd "content"), các thao tác khác là module_action
    actions: actions.map(({ a, l }) => ({ key: a === "view" ? module : `${module}_${a}`, label: l })),
  };
}

/** Danh sách quyền nhóm theo từng chức năng (dùng cho UI gán quyền) */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  withActions("dashboard", "Bảng điều khiển", "LayoutDashboard", [{ a: "view", l: "Xem" }]),
  withActions("content_studio", "Studio nội dung AI", "SlidersHorizontal", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Tạo nội dung (gọi AI)" },
  ]),
  withActions("calendar", "Lịch nội dung", "CalendarDays", [{ a: "view", l: "Xem" }]),
  withActions("trends", "Xu hướng BĐS", "Flame", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Thu thập / thêm trend" },
    { a: "delete", l: "Xoá" },
  ]),
  withActions("content", "Quản lý nội dung", "Files", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Thêm" },
    { a: "update", l: "Sửa" },
    { a: "delete", l: "Xoá" },
  ]),
  withActions("leads", "Khách hàng tiềm năng", "Users", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Thêm" },
    { a: "update", l: "Sửa" },
    { a: "delete", l: "Xoá" },
    { a: "export", l: "Xuất Excel" },
  ]),
  withActions("ads", "Chạy quảng cáo", "Megaphone", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Thêm chiến dịch" },
    { a: "update", l: "Cập nhật số liệu" },
    { a: "delete", l: "Xoá" },
  ]),
  withActions("social", "Mạng xã hội", "Share2", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Nhập số liệu" },
    { a: "update", l: "Sửa số liệu" },
    { a: "delete", l: "Xoá số liệu" },
    { a: "export", l: "Xuất Excel" },
  ]),
  withActions("team", "Cộng tác nhóm", "UserRoundCheck", [
    { a: "view", l: "Xem" },
    { a: "create", l: "Giao việc" },
    { a: "update", l: "Sửa" },
    { a: "delete", l: "Xoá công việc" },
  ]),
  withActions("reports", "Báo cáo", "FileBarChart", [
    { a: "view", l: "Xem" },
    { a: "export", l: "Xuất báo cáo" },
  ]),
  withActions("analytics", "Phân tích Marketing", "Target", [{ a: "view", l: "Xem" }]),
  withActions("assistant", "Trợ lý AI Tân Phú Land", "Bot", [{ a: "view", l: "Xem" }]),
  withActions("utm", "UTM Builder", "Link2", [{ a: "view", l: "Xem" }]),
  withActions("reports_work", "Báo cáo công việc", "ClipboardList", [
    { a: "view", l: "Xem" },
    { a: "upload", l: "Nộp file (tải lên)" },
    { a: "download", l: "Tải về" },
    { a: "delete", l: "Xoá file" },
  ]),
  withActions("dailyreports", "Nhật ký công việc", "NotebookPen", [
    { a: "write", l: "Tự nhập & sửa báo cáo của mình" },
    { a: "viewall", l: "Xem tất cả báo cáo của nhân viên" },
  ]),
];

/** Danh sách quyền phẳng (để kiểm tra trong code, guard...) */
export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_GROUPS.flatMap((g) => g.actions);

/** Các module nhân viên mặc định được cấp (trừ settings, users) */
const STAFF_MODULES = [
  "dashboard", "content_studio", "calendar", "content",
  "leads", "ads", "social", "trends", "team", "analytics", "assistant", "utm",
  "reports", "reports_work",
];

/** Quyền mặc định khi admin tạo nhân viên mới: mọi thao tác của các module được cấp,
 *  RIÊNG các quyền nhạy cảm (sửa công việc, cập nhật số liệu quảng cáo, và các thao tác
 *  ghi/xoá/xuất Excel của Mạng xã hội) phải được Admin cấp trong phần Phân quyền. */
const DEFAULT_EXCLUDED: string[] = [
  "team_update", "team_delete", "ads_update",
  "social_create", "social_update", "social_delete", "social_export",
];
export const DEFAULT_PERMISSIONS: string[] = PERMISSION_GROUPS
  .filter((g) => STAFF_MODULES.includes(g.module))
  .flatMap((g) => g.actions.map((a) => a.key))
  .filter((k) => !DEFAULT_EXCLUDED.includes(k));

export function isAdminLike(user?: { role?: string; permissions?: string } | null): boolean {
  if (!user) return false;
  if (user.role === ADMIN_ROLE) return true;
  try {
    const perms = JSON.parse(user.permissions || "[]");
    return Array.isArray(perms) && perms.includes(WILDCARD);
  } catch {
    return false;
  }
}

export function getUserPermissions(permsField?: string | null): string[] {
  try {
    const arr = JSON.parse(permsField || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function canAccess(
  user?: { role?: string; permissions?: string } | null,
  key?: string | null
): boolean {
  if (!user || !key) return false;
  if (isAdminLike(user)) return true;
  return getUserPermissions(user.permissions).includes(key);
}