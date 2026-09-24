// ---------------------------------------------------------------------------
// Tách văn bản tổng hợp của BÁO CÁO CHUNG thành TỪNG DÒNG để hiển thị dễ đọc
// (mỗi câu / mỗi mục xuống 1 hàng riêng thay vì dồn vào 1 hàng dài).
//
// Module THUẦN — không import prisma / node / react → dùng chung cho:
//   - server: lib/monthlyReport.ts (dựng từng đoạn văn cho file Word)
//   - client: components/GeneralReportPanel.tsx (hiển thị trên Dashboard)
// ---------------------------------------------------------------------------

/** Câu ngắn hơn ngưỡng này không tách dòng (tránh cắt nhầm "1.500", "VD:"...) */
const MIN_SENTENCE = 40;

/** Cắt 1 dòng văn bản thành nhiều câu, mỗi câu 1 phần tử */
function splitLine(line: string): string[] {
  const clean = line.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let cur = "";
  for (const token of clean.split(" ")) {
    cur = cur ? `${cur} ${token}` : token;
    const ends = /[.!?:;]$/.test(token) || /[.!?:;]["'”’)\]]$/.test(token);
    if (ends && cur.length >= MIN_SENTENCE) {
      out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Văn bản (có thể nhiều đoạn, gạch đầu dòng, chấm phẩy) → danh sách dòng.
 * Mỗi phần tử là 1 câu / 1 mục để component hiển thị xuống hàng.
 */
export function splitSentences(text: string): string[] {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .flatMap((line) => splitLine(line.replace(/^[\s\-–—•*+]+/, "")))
    .filter(Boolean);
}
