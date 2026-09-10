/**
 * Chính sách mật khẩu mạnh — dùng chung cho cả CLIENT (hiển thị/hiệu lực ngay)
 * và SERVER (bảo vệ thật). File này KHÔNG import node:crypto để an toàn cho trình duyệt.
 */
export const PASSWORD_RULE =
  "Mật khẩu phải từ 8 ký tự trở lên, gồm ít nhất 1 chữ in hoa (A-Z), 1 chữ thường (a-z), 1 chữ số (0-9) và 1 ký tự đặc biệt (vd: Admin@123).";

export function validatePassword(pw: string): { ok: boolean; message: string } {
  if (!pw || pw.length < 8) {
    return { ok: false, message: "Mật khẩu phải từ 8 ký tự trở lên." };
  }
  if (!/[A-Z]/.test(pw)) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 1 chữ IN HOA (A-Z)." };
  }
  if (!/[a-z]/.test(pw)) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 1 chữ thường (a-z)." };
  }
  if (!/\d/.test(pw)) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 1 chữ SỐ (0-9)." };
  }
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return { ok: false, message: "Mật khẩu phải có ít nhất 1 ký tự ĐẶC BIỆT (vd: !@#$%)." };
  }
  return { ok: true, message: "" };
}
