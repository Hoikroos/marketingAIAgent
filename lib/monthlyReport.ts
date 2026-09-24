// ---------------------------------------------------------------------------
// BÁO CÁO CHUNG THÁNG — gom dữ liệu làm việc theo tuần của từng nhân viên
// (báo cáo công việc nộp file + nhật ký ngày + nội dung/lead/task/MXH),
// dùng AI tổng hợp (lib/aiConfig) với fallback mẫu tự động khi không có AI.
// Kết quả AI được cache vào bảng Setting (key "generalReport_<Y>-<MM>").
// ---------------------------------------------------------------------------
import { prisma } from "@/lib/prisma";
import { periodKey, periodLabel } from "@/lib/workStats";
import { getAICfg, callAIChat, type AICfg } from "@/lib/aiConfig";
import { readFileStored } from "@/lib/storage";
import { extractDocxParagraphs, type DocxPara } from "@/lib/docx";
import { splitSentences } from "@/lib/textLines";

export const GENERAL_CACHE_PREFIX = "generalReport_";
const TRUNC_FILE = 1400; // ký tự tối đa lấy từ 1 file báo cáo nộp
const TRUNC_DAILY = 900; // ký tự tối đa phần nhật ký của 1 tuần

export function monthKeyOf(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export type WeekRow = { key: string; label: string; range: string };
export type FileRef = { title: string; fileName: string; text: string };
export type EmpWeek = {
  dailyCount: number;
  dailyText: string;
  files: FileRef[];
  contents: number;
  contentViews: number;
  contentLeads: number;
  leads: number;
  leadsWon: number;
  tasksDone: number;
  socialViews: number;
  socialVideos: number;
};
export type EmpTotals = {
  files: number; daily: number; contents: number; contentViews: number; contentLeads: number;
  leads: number; leadsWon: number; tasksDone: number; socialViews: number; socialVideos: number;
};
export type EmpMonth = {
  userId: number;
  name: string;
  jobTitle: string;
  weeks: Record<string, EmpWeek>;
  totals: EmpTotals;
};
export type TeamWeek = {
  files: number; daily: number; contents: number; contentViews: number; contentLeads: number;
  leads: number; leadsWon: number; tasksDone: number; socialViews: number; socialVideos: number;
};
export type MonthData = {
  year: number;
  month: number;
  label: string;
  weeks: WeekRow[];
  employees: EmpMonth[];
  teamWeeks: Record<string, TeamWeek>;
  teamTotals: TeamWeek & { reportsTotal: number; reportsSubmitted: number };
};

export type GeneralCache = {
  overall: string;
  employees: Record<string, { overall: string; weeks: Record<string, string> }>;
  provider: string;
  model: string;
  generatedAt: string;
  generatedBy: string;
  aiUsed: boolean;
};

function emptyWeek(): EmpWeek {
  return { dailyCount: 0, dailyText: "", files: [], contents: 0, contentViews: 0, contentLeads: 0, leads: 0, leadsWon: 0, tasksDone: 0, socialViews: 0, socialVideos: 0 };
}
function emptyTotals(): EmpTotals {
  return { files: 0, daily: 0, contents: 0, contentViews: 0, contentLeads: 0, leads: 0, leadsWon: 0, tasksDone: 0, socialViews: 0, socialVideos: 0 };
}
function emptyTeam(): TeamWeek {
  return { files: 0, daily: 0, contents: 0, contentViews: 0, contentLeads: 0, leads: 0, leadsWon: 0, tasksDone: 0, socialViews: 0, socialVideos: 0 };
}
function hasActivity(x: EmpWeek) {
  return !!(x.contents || x.leads || x.tasksDone || x.socialViews || x.socialVideos);
}
function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Gom toàn bộ dữ liệu làm việc của 1 tháng theo tuần của từng nhân viên */
export async function collectMonthData(year: number, month: number): Promise<MonthData> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const ym = monthKeyOf(year, month);
  const fd = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  // ---- Các tuần của tháng (cùng cách đánh số tuần "YYYY-Wxx" của dự án) ----
  const weekOrder: string[] = [];
  const weekDays = new Map<string, { first: number; last: number }>();
  for (let d = 1; d <= 31; d++) {
    const day = new Date(year, month - 1, d);
    if (day.getMonth() !== month - 1 || day.getDate() !== d) break;
    const key = periodKey(day, "week");
    const r = weekDays.get(key);
    if (r) r.last = d;
    else {
      weekOrder.push(key);
      weekDays.set(key, { first: d, last: d });
    }
  }
  const weeks: WeekRow[] = weekOrder.map((key) => {
    const r = weekDays.get(key)!;
    return { key, label: periodLabel(key, "week"), range: `${fd(new Date(year, month - 1, r.first))} – ${fd(new Date(year, month - 1, r.last))}` };
  });

  const users = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, jobTitle: true } });

  const [reports, dailies, contents, leads, tasks, socials] = await Promise.all([
    // Báo cáo công việc: tính theo thời điểm NỘP (nếu đã nộp) hoặc ngày giao
    prisma.report.findMany({
      where: {
        OR: [
          { submittedAt: { gte: start, lt: end } },
          { AND: [{ submittedAt: null }, { createdAt: { gte: start, lt: end } }] },
        ],
      },
      include: { employee: { select: { id: true, name: true } } },
    }),
    prisma.dailyReport.findMany({ where: { date: { startsWith: ym } }, orderBy: { date: "asc" } }),
    prisma.content.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { authorId: true, views: true, leads: true, createdAt: true, author: { select: { id: true, name: true } } },
    }),
    prisma.lead.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { ownerId: true, status: true, createdAt: true } }),
    prisma.task.findMany({ where: { status: "Đã hoàn thành", createdAt: { gte: start, lt: end } }, select: { assignee: true, createdAt: true } }),
    prisma.socialMetric.findMany({ where: { weekLabel: { in: weekOrder } }, select: { ownerId: true, views: true, videosPosted: true, weekLabel: true } }),
  ]);

  // ---- Danh sách nhân viên (thêm cả người không còn active nhưng có dữ liệu) ----
  const employees = new Map<number, EmpMonth>();
  const empOf = (id: number, name?: string, jobTitle?: string): EmpMonth => {
    let e = employees.get(id);
    if (!e) {
      e = { userId: id, name: name || `#${id}`, jobTitle: jobTitle || "", weeks: {}, totals: emptyTotals() };
      for (const w of weeks) e.weeks[w.key] = emptyWeek();
      employees.set(id, e);
    }
    if (name && e.name.startsWith("#")) e.name = name;
    return e;
  };
  for (const u of users) empOf(u.id, u.name, u.jobTitle || "");

  // ---- Báo cáo công việc nộp file: đọc nội dung file (docx/txt) để AI đọc ----
  for (const r of reports) {
    const when = new Date((r.submittedAt ?? r.createdAt) as Date);
    const wk = periodKey(when, "week");
    const ref: FileRef = { title: r.title, fileName: r.fileName || "", text: "" };
    if (r.filePath && r.status === "Đã nộp") {
      try {
        const buf = await readFileStored(r.filePath);
        if (buf) {
          const ext = (r.fileName?.split(".").pop() || "").toLowerCase();
          if (ext === "docx") ref.text = extractDocxParagraphs(buf).join(" ");
          else if (ext === "txt" || ext === "md" || ext === "csv") ref.text = buf.toString("utf8").replace(/\s+/g, " ");
          ref.text = clip(ref.text.trim(), TRUNC_FILE);
        }
      } catch {}
    }
    const e = empOf(r.employeeId, r.employee?.name);
    const w = e.weeks[wk];
    if (w) w.files.push(ref);
  }

  // ---- Nhật ký công việc hằng ngày (date "YYYY-MM-DD") ----
  for (const d of dailies) {
    const wk = periodKey(new Date(`${d.date}T00:00:00`), "week");
    const w = empOf(d.userId, d.userName).weeks[wk];
    if (!w) continue;
    w.dailyCount++;
    w.dailyText += (w.dailyText ? " | " : "") + String(d.tasksDone || "").replace(/\s+/g, " ");
  }
  for (const e of employees.values()) for (const k of Object.keys(e.weeks)) e.weeks[k].dailyText = clip(e.weeks[k].dailyText, TRUNC_DAILY);

  // ---- Nội dung mới ----
  for (const c of contents) {
    if (!c.authorId) continue;
    const wk = periodKey(new Date(c.createdAt), "week");
    const w = empOf(c.authorId, c.author?.name).weeks[wk];
    if (!w) continue;
    w.contents++;
    w.contentViews += c.views || 0;
    w.contentLeads += c.leads || 0;
  }

  // ---- Khách hàng tiềm năng ----
  for (const l of leads) {
    if (!l.ownerId) continue;
    const wk = periodKey(new Date(l.createdAt), "week");
    const w = employees.get(l.ownerId)?.weeks[wk];
    if (!w) continue;
    w.leads++;
    if (l.status === "Đã chốt") w.leadsWon++;
  }

  // ---- Công việc hoàn thành (assignee là chuỗi tên, cách nhau " · ") ----
  const nameToId = new Map(users.map((u) => [u.name, u.id]));
  for (const t of tasks) {
    const wk = periodKey(new Date(t.createdAt), "week");
    for (const nm of (t.assignee || "").split(" · ").map((s) => s.trim()).filter(Boolean)) {
      const id = nameToId.get(nm);
      const w = id ? employees.get(id)?.weeks[wk] : undefined;
      if (w) w.tasksDone++;
    }
  }

  // ---- Số liệu MXH theo tuần (SocialMetric.weekLabel khớp tuần của tháng) ----
  for (const s of socials) {
    if (!s.ownerId) continue;
    const w = employees.get(s.ownerId)?.weeks[s.weekLabel];
    if (!w) continue;
    w.socialViews += s.views || 0;
    w.socialVideos += s.videosPosted || 0;
  }

  // ---- Tổng hợp ----
  const list = [...employees.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  for (const e of list) {
    for (const key of weekOrder) {
      const x = e.weeks[key];
      e.totals.files += x.files.length;
      e.totals.daily += x.dailyCount;
      e.totals.contents += x.contents;
      e.totals.contentViews += x.contentViews;
      e.totals.contentLeads += x.contentLeads;
      e.totals.leads += x.leads;
      e.totals.leadsWon += x.leadsWon;
      e.totals.tasksDone += x.tasksDone;
      e.totals.socialViews += x.socialViews;
      e.totals.socialVideos += x.socialVideos;
    }
  }
  const teamWeeks: Record<string, TeamWeek> = {};
  for (const key of weekOrder) {
    const t = emptyTeam();
    for (const e of list) {
      const x = e.weeks[key];
      t.files += x.files.length;
      t.daily += x.dailyCount;
      t.contents += x.contents;
      t.contentViews += x.contentViews;
      t.contentLeads += x.contentLeads;
      t.leads += x.leads;
      t.leadsWon += x.leadsWon;
      t.tasksDone += x.tasksDone;
      t.socialViews += x.socialViews;
      t.socialVideos += x.socialVideos;
    }
    teamWeeks[key] = t;
  }
  const teamTotals = { ...emptyTeam(), reportsTotal: reports.length, reportsSubmitted: reports.filter((r) => r.status === "Đã nộp").length };
  teamTotals.leads = leads.length;
  teamTotals.leadsWon = leads.filter((l) => l.status === "Đã chốt").length;
  teamTotals.contents = contents.length;
  teamTotals.contentViews = contents.reduce((s, c) => s + (c.views || 0), 0);
  teamTotals.contentLeads = contents.reduce((s, c) => s + (c.leads || 0), 0);
  teamTotals.tasksDone = tasks.length;
  teamTotals.daily = dailies.length;
  teamTotals.files = reports.filter((r) => r.status === "Đã nộp").length;
  teamTotals.socialViews = socials.reduce((s, x) => s + (x.views || 0), 0);
  teamTotals.socialVideos = socials.reduce((s, x) => s + (x.videosPosted || 0), 0);

  return { year, month, label: `Tháng ${month}/${year}`, weeks, employees: list, teamWeeks, teamTotals };
}

// ===========================================================================
// TỔNG HỢP BẰNG AI (+ fallback mẫu tự động khi không có key / AI lỗi)
// ===========================================================================

const SYSTEM_PROMPT =
  "Bạn là trợ lý tổng hợp báo cáo cho phòng marketing bất động sản. Viết tiếng Việt, văn phong báo cáo chuyên nghiệp, súc tích, trung thực — KHÔNG bịa số liệu hay sự việc không có trong dữ liệu. Chỉ trả về nội dung theo đúng định dạng được yêu cầu.";

const weekNumOf = (label: string) => label.match(/\d+/)?.[0] ?? "";

function empPrompt(emp: EmpMonth, data: MonthData): string {
  const lines: string[] = [];
  lines.push(`Hãy tổng hợp báo cáo làm việc THÁNG ${data.month}/${data.year} của nhân viên ${emp.name}${emp.jobTitle ? ` (${emp.jobTitle})` : ""}. Dữ liệu gom theo từng tuần:`);
  for (const w of data.weeks) {
    const x = emp.weeks[w.key];
    lines.push("", `[TUẦN ${w.label} (${w.range})]`);
    if (x.dailyCount === 0 && x.files.length === 0 && !hasActivity(x)) {
      lines.push("- Không có dữ liệu trong tuần này.");
      continue;
    }
    if (x.dailyCount > 0) lines.push(`- Nhật ký công việc (${x.dailyCount} ngày): ${x.dailyText || "(trống nội dung)"}`);
    for (const f of x.files) lines.push(`- Báo cáo nộp "${f.title}"${f.text ? `: ${f.text}` : " (không đọc được nội dung file)"}`);
    lines.push(`- Số liệu: ${x.contents} nội dung mới (${x.contentViews} views, ${x.contentLeads} lead về); ${x.leads} khách mới (${x.leadsWon} đã chốt); ${x.tasksDone} công việc hoàn thành; MXH ${x.socialViews} views / ${x.socialVideos} video đăng`);
  }
  lines.push("", `Yêu cầu — trả về ĐÚNG định dạng sau (không dùng markdown, không thêm mục khác):
MỖI Ý VIẾT TRÊN MỘT DÒNG RIÊNG, mỗi dòng bắt đầu bằng "- " (KHÔNG dồn nhiều ý vào 1 dòng dài) để báo cáo dễ đọc.
TỔNG QUAN THÁNG:
<2-4 dòng đánh giá kết quả tháng của nhân viên: việc đã làm, kết quả nổi bật, tồn tại và đề xuất>
Rồi với MỖI tuần ở trên (giữ nguyên nhãn tuần), viết:
[TUẦN <nhãn tuần như trên>]
<2-3 dòng tóm tắt tuần: việc đã làm, kết quả, tồn tại>`);
  return lines.join("\n");
}

/** Phản hồi AI → { overall, weeks[weekKey] } (khớp tuần theo số tuần) */
function parseEmpSummary(text: string, weeks: WeekRow[]) {
  const out = { overall: "", weeks: {} as Record<string, string> };
  const overallM = text.match(/TỔNG QUAN THÁNG\s*:?\s*([\s\S]*?)(?=\n?\[TUẦN|$)/i);
  if (overallM) out.overall = overallM[1].trim();
  for (const m of text.matchAll(/\[TUẦN\s+([^\]]+)\]\s*:?\s*([\s\S]*?)(?=\n?\[TUẦN|$)/gi)) {
    const num = weekNumOf(m[1]);
    const body = m[2].trim();
    if (!num || !body) continue;
    const w = weeks.find((x) => weekNumOf(x.label) === num);
    if (w) out.weeks[w.key] = body;
  }
  return out;
}

/** Số liệu 1 tuần của nhân viên → TỪNG chỉ số 1 dòng (hiển thị + file Word đều xuống hàng) */
function weekLineItems(x: EmpWeek): string[] {
  const parts: string[] = [];
  if (x.files.length) parts.push(`nộp ${x.files.length} báo cáo`);
  if (x.dailyCount) parts.push(`${x.dailyCount} nhật ký ngày`);
  if (x.contents) parts.push(`${x.contents} nội dung mới (${x.contentViews} views, ${x.contentLeads} lead)`);
  if (x.leads) parts.push(`${x.leads} khách mới (${x.leadsWon} đã chốt)`);
  if (x.tasksDone) parts.push(`${x.tasksDone} công việc hoàn thành`);
  if (x.socialViews || x.socialVideos) parts.push(`MXH ${x.socialViews} views / ${x.socialVideos} video`);
  return parts;
}

/** Số liệu của 1 kỳ cho cả nhóm → TỪNG chỉ số 1 dòng */
function teamLineItems(t: Partial<TeamWeek> & { reportsTotal?: number; reportsSubmitted?: number }): string[] {
  const parts: string[] = [];
  if (t.leads) parts.push(`${t.leads} khách hàng mới (${t.leadsWon || 0} đã chốt)`);
  if (t.contents) parts.push(`${t.contents} nội dung (${t.contentViews || 0} views, ${t.contentLeads || 0} lead)`);
  if (t.tasksDone) parts.push(`${t.tasksDone} công việc hoàn thành`);
  if (t.daily) parts.push(`${t.daily} nhật ký ngày`);
  if (t.files) parts.push(`${t.files} báo cáo nộp file`);
  if (t.reportsTotal != null) parts.push(`tỷ lệ nộp báo cáo ${t.reportsTotal ? Math.round(((t.reportsSubmitted || 0) / t.reportsTotal) * 100) : 0}%`);
  if (t.socialViews || t.socialVideos) parts.push(`MXH ${t.socialViews || 0} views / ${t.socialVideos || 0} video`);
  return parts;
}

/** Dòng mô tả số liệu của 1 kỳ cho cả nhóm (gộp 1 dòng — dùng cho prompt AI) */
function teamLine(t: Partial<TeamWeek> & { reportsTotal?: number; reportsSubmitted?: number }): string {
  const parts = teamLineItems(t);
  return parts.length ? parts.join(" · ") : "Không ghi nhận hoạt động";
}

// ---- Fallback khi không có AI / AI lỗi ----
function fallbackWeekSummary(emp: EmpMonth, key: string, data: MonthData): string {
  const x = emp.weeks[key];
  const w = data.weeks.find((v) => v.key === key);
  const parts: string[] = [];
  if (x.files.length) parts.push(`nộp ${x.files.length} báo cáo (${x.files.map((f) => f.title).join(", ")})`);
  if (x.dailyCount) parts.push(`viết ${x.dailyCount} nhật ký công việc`);
  if (x.contents) parts.push(`tạo ${x.contents} nội dung mới (${x.contentViews} views, ${x.contentLeads} lead về)`);
  if (x.leads) parts.push(`tiếp nhận ${x.leads} khách mới (${x.leadsWon} đã chốt)`);
  if (x.tasksDone) parts.push(`hoàn thành ${x.tasksDone} công việc`);
  if (x.socialViews || x.socialVideos) parts.push(`MXH ${x.socialViews} views / ${x.socialVideos} video`);
  return parts.length ? `${emp.name}: ${parts.join("; ")}.` : `${emp.name}: ${w?.label ?? ""} chưa ghi nhận hoạt động nào trong hệ thống.`;
}

function fallbackOverall(emp: EmpMonth, data: MonthData): string {
  const t = emp.totals;
  const parts: string[] = [];
  if (t.files) parts.push(`nộp ${t.files} báo cáo công việc`);
  if (t.daily) parts.push(`${t.daily} nhật ký ngày`);
  if (t.contents) parts.push(`tạo ${t.contents} nội dung (${t.contentViews} views, ${t.contentLeads} lead)`);
  if (t.leads) parts.push(`${t.leads} khách hàng mới (${t.leadsWon} đã chốt)`);
  if (t.tasksDone) parts.push(`hoàn thành ${t.tasksDone} công việc`);
  if (t.socialViews || t.socialVideos) parts.push(`MXH ${t.socialViews} views / ${t.socialVideos} video`);
  return parts.length
    ? `${emp.name}: trong ${data.label.toLowerCase()} đã ${parts.join("; ")}. (Bản tổng hợp tự động — bấm "Tổng hợp bằng AI" để có nhận xét chi tiết.)`
    : `${emp.name}: ${data.label.toLowerCase()} chưa ghi nhận hoạt động nào trong hệ thống.`;
}

function fallbackTeam(data: MonthData): string {
  return `${data.label}: ${teamLine(data.teamTotals)}. Chi tiết từng nhân viên xem ở mục III.`;
}

// ---- Cache bản tổng hợp vào bảng Setting (không cần thêm model mới) ----
export async function getGeneralCache(year: number, month: number): Promise<GeneralCache | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: GENERAL_CACHE_PREFIX + monthKeyOf(year, month) } });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value);
    if (!parsed || typeof parsed !== "object" || !parsed.employees) return null;
    return parsed as GeneralCache;
  } catch {
    return null;
  }
}

export async function saveGeneralCache(year: number, month: number, cache: GeneralCache): Promise<void> {
  const key = GENERAL_CACHE_PREFIX + monthKeyOf(year, month);
  const value = JSON.stringify(cache);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value, description: "Báo cáo chung tháng — tổng hợp AI" },
    update: { value },
  });
}

/** Chạy AI tổng hợp cho từng nhân viên + tổng quan chung. AI lỗi/cấu hình thiếu → fallback mẫu. */
export async function synthesizeMonth(data: MonthData, generatedBy: string): Promise<GeneralCache> {
  const cache: GeneralCache = { overall: "", employees: {}, provider: "", model: "", generatedAt: new Date().toISOString(), generatedBy, aiUsed: false };
  let cfg: AICfg | null = null;
  try {
    cfg = await getAICfg();
  } catch {}
  const hasAI = !!(cfg && cfg.key);
  if (cfg) {
    cache.provider = cfg.provider;
    cache.model = cfg.model;
  }

  for (const emp of data.employees) {
    const slot = { overall: "", weeks: {} as Record<string, string> };
    if (hasAI && cfg) {
      try {
        const res = await callAIChat(cfg, { system: SYSTEM_PROMPT, user: empPrompt(emp, data), temperature: 0.3, maxTokens: 6000, timeoutMs: 90_000 });
        const parsed = parseEmpSummary(res, data.weeks);
        if (parsed.overall) slot.overall = parsed.overall;
        slot.weeks = parsed.weeks;
      } catch {}
    }
    if (slot.overall || Object.keys(slot.weeks).length) cache.aiUsed = true;
    if (!slot.overall) slot.overall = fallbackOverall(emp, data);
    for (const w of data.weeks) if (!slot.weeks[w.key]) slot.weeks[w.key] = fallbackWeekSummary(emp, w.key, data);
    cache.employees[String(emp.userId)] = slot;
  }

  if (hasAI && cfg) {
    try {
      const res = await callAIChat(cfg, {
        system: SYSTEM_PROMPT,
        user: `Dưới đây là bản tổng hợp tháng ${data.month}/${data.year} của từng nhân viên phòng Marketing:\n${data.employees
          .map((e) => `- ${e.name}: ${cache.employees[String(e.userId)].overall}`)
          .join("\n")}\n\nSố liệu chung: ${teamLine(data.teamTotals)}\n\nViết MỘT đoạn TỔNG QUAN chung của cả phòng (3-5 câu): điểm nhấn kết quả, nhân viên nổi bật (nếu có), tồn tại chung và đề xuất. Chỉ trả về đoạn văn, không tiêu đề.`,
        temperature: 0.3,
        maxTokens: 1500,
        timeoutMs: 90_000,
      });
      if (res.trim()) cache.overall = res.trim();
    } catch {}
  }
  if (!cache.overall) cache.overall = fallbackTeam(data);
  return cache;
}

/**
 * Bản tổng hợp KHÔNG gọi AI (dùng mẫu tự động) — dùng khi người dùng chỉ có quyền
 * TẢI file Word (không có quyền tổng hợp AI) và tháng đó chưa có bản AI nào trong cache.
 */
export function fallbackCache(data: MonthData, generatedBy: string): GeneralCache {
  const cache: GeneralCache = {
    overall: fallbackTeam(data),
    employees: {},
    provider: "",
    model: "",
    generatedAt: new Date().toISOString(),
    generatedBy,
    aiUsed: false,
  };
  for (const emp of data.employees) {
    const slot = { overall: fallbackOverall(emp, data), weeks: {} as Record<string, string> };
    for (const w of data.weeks) slot.weeks[w.key] = fallbackWeekSummary(emp, w.key, data);
    cache.employees[String(emp.userId)] = slot;
  }
  return cache;
}

// ===========================================================================
// DỰNG NỘI DUNG FILE WORD "BÁO CÁO CHUNG THÁNG"
// ===========================================================================

/** Đẩy 1 đoạn văn (AI/fallback) vào file Word — MỖI CÂU 1 ĐOẠN để dễ đọc */
function pushText(P: DocxPara[], text: string, style: DocxPara["style"] = "body") {
  for (const line of splitSentences(text)) P.push({ text: line, style });
}

/** Đẩy số liệu vào file Word — MỖI CHỈ SỐ 1 GẠCH ĐẦU DÒNG (xuống hàng) */
function pushStats(P: DocxPara[], items: string[]) {
  if (!items.length) {
    P.push({ text: "Không ghi nhận hoạt động", style: "bullet" });
    return;
  }
  for (const it of items) P.push({ text: it, style: "bullet" });
}

export function buildDocxParas(data: MonthData, cache: GeneralCache): DocxPara[] {
  const P: DocxPara[] = [];
  const now = new Date().toLocaleString("vi-VN");
  P.push({ text: `BÁO CÁO CHUNG THÁNG ${data.month}/${data.year}`, style: "title" });
  P.push({ text: `Phòng Marketing — tổng hợp từ báo cáo tuần của nhân viên`, style: "subtitle" });
  P.push({
    text: cache.aiUsed
      ? `Tổng hợp bởi AI (${cache.provider} · ${cache.model}) lúc ${new Date(cache.generatedAt).toLocaleString("vi-VN")} — bởi ${cache.generatedBy}`
      : `Mẫu tổng hợp tự động (chưa cấu hình AI) — xuất lúc ${now}`,
    style: "meta",
  });

  P.push({ text: "I. TỔNG QUAN", style: "h1" });
  pushText(P, cache.overall);
  P.push({ text: "Số liệu tháng:", style: "meta" });
  pushStats(P, teamLineItems(data.teamTotals));

  P.push({ text: "II. KẾT QUẢ THEO TUẦN", style: "h1" });
  for (const w of data.weeks) {
    P.push({ text: `${w.label} (${w.range})`, style: "h2" });
    pushStats(P, teamLineItems(data.teamWeeks[w.key]));
  }

  P.push({ text: "III. CHI TIẾT THEO NHÂN VIÊN", style: "h1" });
  for (const e of data.employees) {
    const slot = cache.employees[String(e.userId)];
    P.push({ text: `${e.name}${e.jobTitle ? " — " + e.jobTitle : ""}`, style: "h2" });
    pushText(P, slot?.overall || fallbackOverall(e, data));
    for (const w of data.weeks) {
      const x = e.weeks[w.key];
      P.push({ text: `${w.label} (${w.range})`, style: "h3" });
      pushText(P, slot?.weeks?.[w.key] || fallbackWeekSummary(e, w.key, data));
      P.push({ text: "Số liệu tuần:", style: "meta" });
      pushStats(P, weekLineItems(x));
      for (const f of x.files) P.push({ text: `Báo cáo đã nộp: ${f.title}`, style: "meta" });
    }
  }

  P.push({ text: `Báo cáo được tổng hợp tự động bởi hệ thống — ${now}.`, style: "meta" });
  return P;
}

// ===========================================================================
// JSON CÔNG KHAI cho Dashboard (đã ẩn nội dung thô, chỉ còn tổng hợp + số liệu)
// ===========================================================================

export function toPublicJson(data: MonthData, cache: GeneralCache | null, opts: { all: boolean; onlyUserId?: number }) {
  const emps = opts.all ? data.employees : data.employees.filter((e) => e.userId === opts.onlyUserId);
  return {
    year: data.year,
    month: data.month,
    label: data.label,
    weeks: data.weeks.map((w) => ({ ...w, team: data.teamWeeks[w.key] })),
    teamTotals: data.teamTotals,
    aiUsed: !!cache?.aiUsed,
    overall: cache?.overall || fallbackTeam(data),
    employees: emps.map((e) => {
      const slot = cache?.employees?.[String(e.userId)];
      return {
        userId: e.userId,
        name: e.name,
        jobTitle: e.jobTitle,
        totals: e.totals,
        overall: slot?.overall || fallbackOverall(e, data),
        weeks: Object.fromEntries(
          data.weeks.map((w) => {
            const x = e.weeks[w.key];
            return [
              w.key,
              {
                dailyCount: x.dailyCount,
                filesCount: x.files.length,
                fileTitles: x.files.map((f) => f.title),
                contents: x.contents,
                contentViews: x.contentViews,
                contentLeads: x.contentLeads,
                leads: x.leads,
                leadsWon: x.leadsWon,
                tasksDone: x.tasksDone,
                socialViews: x.socialViews,
                socialVideos: x.socialVideos,
                summary: slot?.weeks?.[w.key] || fallbackWeekSummary(e, w.key, data),
              },
            ];
          })
        ),
      };
    }),
  };
}