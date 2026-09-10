import { NextRequest } from "next/server";
import { checkLoginRate, getClientIp, buildLoginKey } from "@/lib/rateLimit";

/**
 * CÔNG KHAI (không cần đăng nhập): cho trang login biết IP hiện tại có đang bị
 * khóa tạm thời vì nhập sai quá nhiều lần không. Bản thân việc khóa vẫn được
 * thực thi chặt chẽ trong authorize() của NextAuth — đây chỉ để hiển thị UX.
 */
export async function GET(req: NextRequest) {
  // Dùng chung khóa với authorize(): email + IP → báo đúng trạng thái khóa tài khoản.
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "";
  const ip = getClientIp({ headers: req.headers } as unknown as Request);
  const check = checkLoginRate(buildLoginKey(ip, email));
  return Response.json({
    locked: !check.allowed,
    retryAfterSec: check.retryAfterSec ?? 0,
  });
}