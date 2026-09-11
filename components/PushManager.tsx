"use client";

import { useEffect, useState } from "react";

/**
 * PushManager — đăng ký Web Push Notification cho thiết bị hiện tại.
 * - Đăng ký Service Worker (/sw.js)
 * - Hỏi quyền thông báo bằng banner nhỏ (không popup ngay khi vào trang)
 * - Lưu subscription vào server (/api/push)
 * Trên iOS: phải "Thêm vào màn hình chính" rồi mở từ icon mới nhận push được (iOS 16.4+).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushManager() {
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Không hỏi lại nếu đã từ chối trong phiên này
    if (sessionStorage.getItem("push-dismissed")) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;
    // Đã cấp quyền rồi → đăng ký luôn, không cần banner
    if (Notification.permission === "granted") {
      registerPush().catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return;
    // Chưa quyết định → hiện banner sau 3 giây (tránh chặn khi vừa mở app)
    const t = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(t);
  }, []);

  async function registerPush() {
    // 1) Đăng ký Service Worker
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 2) Xin quyền thông báo
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Đã từ chối quyền thông báo");

    // 3) Lấy VAPID public key + đăng ký subscription
    const { publicKey } = await fetch("/api/push").then((r) => r.json());
    if (!publicKey) throw new Error("Server chưa cấu hình VAPID key");

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      }));

    // 4) Gửi subscription lên server
    const raw = sub.toJSON();
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
  }

  async function onEnable() {
    setBusy(true);
    try {
      await registerPush();
      setShowBanner(false);
    } catch {
      // Từ chối quyền → không hỏi lại trong phiên
    } finally {
      setBusy(false);
    }
  }

  function onDismiss() {
    sessionStorage.setItem("push-dismissed", "1");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[95] w-[92%] max-w-sm rounded-xl glass p-3 shadow-2xl border border-[var(--border)]">
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0">🔔</span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold">Bật thông báo?</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Nhận thông báo lead mới, task được giao, nhắc đăng bài... ngay trên thiết bị này.
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onEnable}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-[#1b98e0] text-white text-[11px] font-bold hover:bg-[#1376b0] transition disabled:opacity-50"
              type="button"
            >
              {busy ? "Đang bật..." : "Bật thông báo"}
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white transition"
              type="button"
            >
              Để sau
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-white shrink-0" type="button" aria-label="Đóng">
          ✕
        </button>
      </div>
    </div>
  );
}
