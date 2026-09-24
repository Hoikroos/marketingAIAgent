/**
 * Kiểm tra "Báo cáo chung" hiển thị XUỐNG HÀNG (không dồn 1 hàng dài):
 *  1. lib/textLines.ts → tách văn bản tổng hợp thành từng câu / từng mục.
 *  2. lib/monthlyReport.ts → buildDocxParas xuống hàng thật (mỗi câu 1 đoạn,
 *     mỗi chỉ số 1 gạch đầu dòng) và file .docx vẫn đọc ngược được.
 * Chạy: npx tsx scripts/test-textlines.ts
 */
import { splitSentences } from "../lib/textLines";
import { buildDocxParas, type GeneralCache, type MonthData } from "../lib/monthlyReport";
import { buildDocx, extractDocxParagraphs } from "../lib/docx";

let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
console.log("1) splitSentences — mỗi câu / mỗi mục 1 dòng");
const c1 = splitSentences(
  "Tuần này nhân viên hoàn thành tốt các chỉ tiêu đề ra, số lead tăng rõ rệt so với tuần trước. Tuy nhiên tiến độ đăng bài còn chậm ở giữa tuần."
);
check("2 câu → 2 dòng", c1.length === 2, JSON.stringify(c1, null, 0));
check("dòng 1 kết thúc ở dấu chấm", c1[0]?.endsWith("trước.") === true, c1[0]);

const c2 = splitSentences(
  "- Nộp đủ 2 báo cáo tuần đúng hạn\n- Tạo 3 nội dung mới cho TikTok, lượng view tăng tốt\n- Chưa chăm sóc lại nhóm khách cũ"
);
check("3 gạch đầu dòng → 3 dòng, bỏ dấu '- '", c2.length === 3 && !c2.some((l) => l.startsWith("-")), JSON.stringify(c2));

const c3 = splitSentences(
  "Doanh thu tháng này đạt 1.500.000.000 đồng, vượt 12.5% kế hoạch đề ra; số khách hàng tiềm năng mới là 25 khách."
);
check("không cắt nhầm số 1.500.000.000 / 12.5%", c3.length === 2 && c3[0].includes("1.500.000.000") && c3[0].includes("12.5%"), JSON.stringify(c3));

check("văn bản rỗng → []", splitSentences("").length === 0);
check("1 câu ngắn → 1 dòng", splitSentences("Không có dữ liệu trong tuần này.").length === 1);

const c4 = splitSentences(
  "Nguyễn Văn A: trong tháng 9/2026 đã nộp 3 báo cáo công việc; 10 nhật ký ngày; tạo 5 nội dung (1.200 views, 4 lead); 5 khách hàng mới (1 đã chốt). (Bản tổng hợp tự động.)"
);
check("câu fallback dài → nhiều dòng", c4.length > 2, JSON.stringify(c4));

// ---------------------------------------------------------------------------
console.log("2) buildDocxParas — file Word xuống hàng");
const weekKey = "2026-W37";
const week = { files: 1, daily: 2, contents: 3, contentViews: 1200, contentLeads: 4, leads: 5, leadsWon: 1, tasksDone: 2, socialViews: 3000, socialVideos: 2 };
const data: MonthData = {
  year: 2026,
  month: 9,
  label: "Tháng 9/2026",
  weeks: [{ key: weekKey, label: "Tuần 37/2026", range: "07/09 – 13/09" }],
  employees: [
    {
      userId: 1,
      name: "Nguyễn Văn A",
      jobTitle: "Nhân viên nội dung",
      weeks: {
        [weekKey]: {
          dailyCount: 2,
          dailyText: "Viết bài, chăm sóc khách.",
          files: [{ title: "Báo cáo tuần 37", fileName: "bc-tuan-37.docx", text: "Nội dung báo cáo nộp." }],
          contents: 3, contentViews: 1200, contentLeads: 4, tasksDone: 2, socialViews: 3000, socialVideos: 2,
        },
      },
      totals: { files: 1, daily: 2, contents: 3, contentViews: 1200, contentLeads: 4, tasksDone: 2, socialViews: 3000, socialVideos: 2 },
    },
  ],
  teamWeeks: { [weekKey]: { ...week } },
  teamTotals: { ...week, reportsTotal: 1, reportsSubmitted: 1 },
};
const cache: GeneralCache = {
  overall:
    "Tháng 9 phòng đạt kết quả khả quan, lượng lead tăng mạnh so với tháng trước. Cần cải thiện tốc độ phản hồi khách hàng tiềm năng.",
  employees: {
    "1": {
      overall: "Nhân viên A hoàn thành tốt chỉ tiêu nội dung được giao. Khâu chăm sóc lại khách cũ còn chậm.",
      weeks: { [weekKey]: "Tuần 37 nộp báo cáo đúng hạn và tạo 3 nội dung mới. Chưa chăm sóc lại được nhóm khách cũ." },
    },
  },
  provider: "groq",
  model: "llama-3.3",
  generatedAt: new Date().toISOString(),
  generatedBy: "Admin",
  aiUsed: true,
};

const paras = buildDocxParas(data, cache);
const textBody = paras.filter((p) => p.style === "body" || p.style === "bullet");
check("không còn dòng số liệu gộp bằng ' · '", !textBody.some((p) => p.text.includes(" · ")), JSON.stringify(textBody.filter((p) => p.text.includes(" · ")).map((p) => p.text)));
const overallParas = paras.filter((p) => p.style === "body" && p.text.startsWith("Tháng 9 phòng"));
const overallParas2 = paras.filter((p) => p.style === "body" && p.text.startsWith("Cần cải thiện"));
check(
  "tổng quan AI tách 2 đoạn (2 câu)",
  overallParas.length === 1 && overallParas2.length === 1 && !paras.some((p) => p.text.includes("tháng trước.") && p.text.includes("Cần cải thiện")),
  JSON.stringify([...overallParas, ...overallParas2].map((p) => p.text))
);
check(
  "nhận xét tuần của nhân viên tách 2 đoạn",
  paras.filter((p) => p.style === "body" && p.text.startsWith("Tuần 37 nộp báo cáo")).length === 1 &&
    paras.filter((p) => p.style === "body" && p.text.startsWith("Chưa chăm sóc lại được")).length === 1
);
check("mỗi chỉ số 1 gạch đầu dòng", paras.filter((p) => p.style === "bullet" && /khách hàng mới|nội dung \(|công việc hoàn thành|nhật ký ngày|báo cáo nộp file|tỷ lệ nộp báo cáo|MXH \d/.test(p.text)).length >= 7);
check("nhãn 'Số liệu tháng:' đứng riêng 1 dòng", paras.some((p) => p.text === "Số liệu tháng:"));
check("mỗi báo cáo nộp 1 dòng riêng", paras.filter((p) => p.text === "Báo cáo đã nộp: Báo cáo tuần 37").length === 1);

const roundTrip = extractDocxParagraphs(buildDocx(paras));
check("docx đọc ngược đủ số đoạn", roundTrip.length === paras.length, `${roundTrip.length} vs ${paras.length}`);

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra KHÔNG đạt`);
  process.exit(1);
}
console.log("\n✅ Báo cáo chung xuống hàng OK — textLines + file Word đều tách dòng.");
