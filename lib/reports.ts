/** Làm sạch tên file khi lưu: chỉ giữ chữ/số/dấu chấm/gạch */
export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}