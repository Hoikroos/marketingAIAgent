import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVapidPublicKey } from "@/lib/push";

/** GET — trả VAPID public key (công khai, client cần để đăng ký subscription) */
export async function GET() {
  return NextResponse.json({ ok: true, publicKey: getVapidPublicKey() });
}

/** POST — lưu đăng ký nhận push của 1 thiết bị (mỗi user có thể nhiều thiết bị) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const body = await req.json();
    const endpoint = String(body?.endpoint || "");
    const p256dh = String(body?.keys?.p256dh || "");
    const auth = String(body?.keys?.auth || "");
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ ok: false, error: "Thiếu dữ liệu subscription" }, { status: 400 });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: Number(user.id), p256dh, auth },
      create: { userId: Number(user.id), endpoint, p256dh, auth },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE — gỡ đăng ký (user tắt thông báo / thiết bị cũ) */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const endpoint = String(new URL(req.url).searchParams.get("endpoint") || "");
    if (!endpoint) return NextResponse.json({ ok: false, error: "Thiếu endpoint" }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: Number(user.id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
