/**
 * Giới hạn số lần đăng nhập sai (anti brute-force) — chạy trên server (Node runtime).
 * Cơ chế: sliding window theo IP + khóa tạm thời khi vượt ngưỡng.
 * Lưu in-memory — phù hợp deploy 1 instance. Nếu chạy nhiều instance/serverless,
 * nên thay bằng Redis (upstash) hoặc DB; đây là bản đủ dùng cho nội bộ.
 */

type Bucket = {
  failures: number; // số lần thất bại trong cửa sổ hiện tại
  firstAt: number; // thời điểm bắt đầu cửa sổ
  lockedUntil: number; // 0 nếu chưa bị khóa
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // cửa sổ: 15 phút
const MAX_FAILURES = 5; // quá 5 lần sai trong 15 phút
const LOCK_MS = 15 * 60 * 1000; // khóa 15 phút

export type RateCheck = {
  allowed: boolean;
  retryAfterSec?: number; // số giây còn lại khi bị khóa
};

/** Làm sạch các bucket cũ (tránh rò rỉ bộ nhớ) */
function sweep(now: number) {
  for (const [k, b] of buckets) {
    if (b.lockedUntil && b.lockedUntil <= now && now - b.firstAt > WINDOW_MS + LOCK_MS) {
      buckets.delete(k);
    }
  }
}

/** Kiểm tra trước khi cho phép 1 lần thử đăng nhập.
 *  Không có IP hợp lệ (dev/cổng trực tiếp không proxy) → luôn cho phép,
 *  tránh gộp chung 1 bucket "unknown" làm khóa nhầm mọi người. */
export function checkLoginRate(ip?: string): RateCheck {
  if (!ip) return { allowed: true };
  const now = Date.now();
  sweep(now);
  const b = buckets.get(ip);
  if (!b) return { allowed: true };

  if (b.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  // Cửa sổ đã hết → reset
  if (now - b.firstAt > WINDOW_MS) {
    buckets.delete(ip);
    return { allowed: true };
  }
  return { allowed: b.failures < MAX_FAILURES };
}

/** Ghi nhận 1 lần thất bại (chỉ khi có IP thật) */
export function recordLoginFailure(ip?: string) {
  if (!ip) return;
  const now = Date.now();
  const b = buckets.get(ip) ?? { failures: 0, firstAt: now, lockedUntil: 0 };
  if (now - b.firstAt > WINDOW_MS) {
    b.failures = 0;
    b.firstAt = now;
    b.lockedUntil = 0;
  }
  b.failures += 1;
  if (b.failures >= MAX_FAILURES) {
    b.lockedUntil = now + LOCK_MS;
  }
  buckets.set(ip, b);
}

/** Reset khi đăng nhập thành công (chỉ khi có IP thật) */
export function resetLoginRate(ip?: string) {
  if (!ip) return;
  buckets.delete(ip);
}

/** Lấy IP thật từ request (hỗ trợ proxy/reverse proxy).
 *  Trả about undefined khi không xác định được IP → bỏ qua rate-limit. */
export function getClientIp(req?: Request): string | undefined {
  if (!req || typeof req.headers?.get !== "function") return undefined;
  try {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0].trim();
      if (first) return first;
    }
    const real = req.headers.get("x-real-ip");
    if (real && real.trim()) return real.trim();
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Tạo khóa rate-limit ổn định theo TÀI KHOẢN (email) + IP (nếu có).
 * - Trên production (có x-forwarded-for): key = "ip|email" → phân biệt theo thiết bị + tài khoản.
 * - Trên localhost (không có IP thật): key = email → vẫn khóa được đúng tài khoản sau 5 lần sai.
 * Trả undefined khi không có email và không có IP (bỏ qua rate-limit).
 */
export function buildLoginKey(ip: string | undefined, email?: string): string | undefined {
  const e = (email || "").trim().toLowerCase();
  if (!e && !ip) return undefined;
  return ip ? `${ip}|${e}` : e;
}