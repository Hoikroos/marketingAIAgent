import webpush from "web-push";

/**
 * Web Push Notification — đẩy thông báo ra điện thoại/máy tính qua Service Worker.
 * Cần 2 biến môi trường: VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (sinh bằng:
 *   node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))")
 * Nếu thiếu key → hệ thống vẫn chạy bình thường, chỉ là không push ra ngoài.
 */

let configured = false;

function ensureConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    try {
      webpush.setVapidDetails("mailto:admin@tanphuland.vn", pub, priv);
      configured = true;
    } catch {
      return false;
    }
  }
  return true;
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

/** Gửi push đến TẤT CẢ thiết bị đã đăng ký của 1 user. Fire-and-forget an toàn:
 *  không bao giờ ném lỗi làm hỏng luồng chính; subscription hết hạn tự bị xoá. */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body?: string; link?: string }
): Promise<void> {
  try {
    if (!ensureConfigured() || !userId) return;
    const { prisma } = await import("./prisma");
    const subs: { endpoint: string; p256dh: string; auth: string }[] = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    const payloadStr = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payloadStr
          );
        } catch (e: any) {
          // 404/410 = subscription hết hạn/thiết bị gỡ cài đặt → dọn dẹp
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
          }
        }
      })
    );
  } catch {
    // không bao giờ để lỗi push ảnh hưởng nghiệp vụ chính
  }
}
