import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Băm mật khẩu bằng scrypt (tích hợp Node - không cần thư viện ngoài).
 * Format lưu: "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const actual = Buffer.from(hash, "hex");
    return candidate.length === actual.length && timingSafeEqual(candidate, actual);
  } catch {
    return false;
  }
}