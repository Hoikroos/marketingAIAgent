"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Client component dùng ở trang /dashboard/team.
 * Khi URL có ?task={id} (ví dụ click từ thông báo công việc),
 * cuộn tới & làm nổi bật dòng công việc tương ứng.
 * Dùng useSearchParams để hoạt động cả khi đang ở sẵn trên trang này.
 */
export default function TeamTaskFocus() {
  const sp = useSearchParams();
  const taskId = sp.get("task");

  useEffect(() => {
    if (!taskId) return;
    const el = document.getElementById(`task-row-${taskId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("row-focus");

    const t = setTimeout(() => el.classList.remove("row-focus"), 3500);
    return () => clearTimeout(t);
  }, [taskId]);

  return null;
}
