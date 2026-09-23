/**
 * Kiểm tra lib/docx.ts: tạo file .docx → ghi ra TEMP → đọc ngược bằng
 * extractDocxParagraphs (cùng parser dự án dùng cho preview) → so số đoạn.
 * Chạy: npx tsx scripts/test-docx.ts
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDocx, extractDocxParagraphs, type DocxPara } from "../lib/docx";

const paras: DocxPara[] = [
  { text: "BÁO CÁO CHUNG THÁNG 9/2026", style: "title" },
  { text: "Phòng Marketing — tổng hợp từ báo cáo tuần của nhân viên", style: "subtitle" },
  { text: "I. TỔNG QUAN", style: "h1" },
  { text: "Tháng này phòng tập trung sản xuất nội dung và chăm sóc lead, kết quả khả quan.", style: "body" },
  { text: "12 khách hàng mới (3 đã chốt) · 8 nội dung mới · 5 công việc hoàn thành", style: "bullet" },
  { text: "Nguyễn Văn A — Nhân viên nội dung", style: "h2" },
  { text: "Tuần 37/2026 (07/09 – 13/09)", style: "h3" },
  { text: "Nộp 1 báo cáo tuần, tạo 3 nội dung mới cho TikTok, tiếp nhận 5 khách mới.", style: "body" },
  { text: "Số liệu: kiểm tra escape XML <tag> & \"quote\" ' — 100%", style: "meta" },
];

const buf = buildDocx(paras);
const outPath = join(tmpdir(), "test-bao-chung.docx");
writeFileSync(outPath, buf);
console.log(`DOCX ghi ra: ${outPath} (${buf.length} bytes)`);

const back = extractDocxParagraphs(buf);
console.log(`Đọc ngược: ${back.length}/${paras.length} đoạn`);
back.forEach((p, i) => console.log(`  ${i + 1}. ${p.slice(0, 90)}`));

if (back.length !== paras.length) {
  console.error("LỖI: số đoạn đọc ngược không khớp");
  process.exit(1);
}
for (let i = 0; i < paras.length; i++) {
  const expect = paras[i].style === "bullet" ? "• " + paras[i].text : paras[i].text;
  if (back[i] !== expect) {
    console.error(`LỖI: đoạn ${i + 1} không khớp.\n  Mong đợi: ${expect}\n  Thực tế: ${back[i]}`);
    process.exit(1);
  }
}
console.log("✅ Round-trip OK — file .docx hợp lệ (parser của dự án đọc được, Word sẽ mở được).");