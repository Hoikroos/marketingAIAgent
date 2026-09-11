"use client";

import { useEffect, useState } from "react";
import { useToast } from "./toast";

/**
 * PushManager — đăng ký Web Push Notification cho thiết bị hiện tại.
 * - Đăng ký Service Worker (/sw.js)
 * - Hỏi quyền thông báo bằng banner nhỏ; "Để sau" = không hỏi lại trong 7 ngày
 * - Đã cấp quyền từ trước → tự đăng ký im lặng (không hiện banner, không làm phiền)
 * - Bật thành công/thất bại → toast phản hồi rõ ràng (cả desktop lẫn mobile)
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

const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // "Để sau" = hỏi lại sau 7 ngày
const LS_KEY = "push-asked-at";

export default function PushManager() {
  const toast = useToast();
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "granted") {
      // Đã cấp quyền từ trước → đăng ký im lặng, không hiện banner
      registerPush(true).catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return; // bị chặn trong trình duyệt → không hỏi nữa

    // Chưa quyết định → hỏi, nhưng tôn trọng "Để sau" (lưu localStorage, hỏi lại sau 7 ngày)
    const askedAt = Number(localStorage.getItem(LS_KEY) || 0);
    if (askedAt && Date.now() - askedAt < ASK_AGAIN_AFTER_MS) return;
    const t = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(t);
  }, []);

  async function registerPush(silent = false) {
    // 1) Đăng ký Service Worker
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 2) Xin quyền thông báo (bỏ qua khi gọi im lặng — quyền đã granted)
    if (!silent) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Bạn đã từ chối quyền thông báo trong trình duyệt");
    }

    // 3) Lấy VAPID public key + đăng ký subscription
    const res = await fetch("/api/push").then((r) => r.json());
    if (!res.ok || !res.publicKey) throw new Error("Server chưa cấu hình VAPID key (thiếu VAPID_PUBLIC_KEY)");

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(res.publicKey) as any,
      }));

    // 4) Gửi subscription lên server
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  }

  async function onEnable() {
    setBusy(true);
    try {
      await registerPush(false);
      localStorage.setItem(LS_KEY, String(Date.now()));
      setShowBanner(false);
      toast.success("Đã bật thông báo", "Bạn sẽ nhận thông báo trên thiết bị này khi có tin mới.");
    } catch (e: any) {
      localStorage.setItem(LS_KEY, String(Date.now()));
      setShowBanner(false);
      toast.error("Chưa bật được thông báo", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function onDismiss() {
    localStorage.setItem(LS_KEY, String(Date.now()));
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
              title="Không hỏi lại trong 7 ngày"
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
