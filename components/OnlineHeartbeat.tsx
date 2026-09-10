"use client";
import { useEffect } from "react";

/**
 * Heartbeat trạng thái hoạt động: gửi /api/online mỗi 30 giây (và khi quay lại tab)
 * để người khác thấy bạn "Đang hoạt động" hoặc "Hoạt động X phút trước".
 */
export default function OnlineHeartbeat() {
  useEffect(() => {
    let stopped = false;
    const ping = () => {
      fetch("/api/online", { method: "POST" }).catch(() => {});
    };
    ping();
    const t = setInterval(() => {
      if (!stopped) ping();
    }, 30000);
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return null;
}