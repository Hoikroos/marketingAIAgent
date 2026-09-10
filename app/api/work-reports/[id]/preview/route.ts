import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";
import { readFile } from "fs/promises";
import path from "path";
import { inflateRawSync } from "zlib";

async function canView(user: any, report: any) {
  if (!user) return false;
  if (canAccess(user, "users") || isAdminLike(user)) return true;
  const isOwner = Number(report.employeeId) === Number(user.id);
  return isOwner && canAccess(user, "reports_work_download");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Trích các ĐOẠN VĂN từ file .docx (bố cục giống bản Word) mà KHÔNG cần thư viện ngoài:
 *  - tìm EOCD (0x06054b50) để lấy offset central directory
 *  - duyệt central file header (0x02014b50) tìm "word/document.xml"
 *  - giải nén entry bằng zlib (method 8 = deflate, 0 = stored)
 *  - duyệt từng <w:p> (đoạn) → gom văn bản trong <w:t>, nhận biết gạch đầu dòng */
function extractDocxParagraphs(buf: Buffer): string[] {
  const findEocd = (b: Buffer) => {
    const start = Math.max(0, b.length - 65557);
    for (let i = b.length - 22; i >= start; i--) {
      if (b.readUInt32LE(i) === 0x06054b50) return i;
    }
    return -1;
  };

  const eocd = findEocd(buf);
  if (eocd === -1) return [];
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdSize = buf.readUInt32LE(eocd + 12);
  if (cdOffset <= 0 || cdSize <= 0) return [];

  let p = cdOffset;
  const cdEnd = cdOffset + cdSize;
  let method = 0;
  let compSize = 0;
  let localOffset = 0;

  while (p + 46 <= cdEnd) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    if (name === "word/document.xml") {
      method = buf.readUInt16LE(p + 10);
      compSize = buf.readUInt32LE(p + 20);
      localOffset = buf.readUInt32LE(p + 42);
      break;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (!localOffset) return [];

  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen + extraLen;

  let raw: Buffer;
  if (method === 0) raw = buf.subarray(dataStart, dataStart + compSize);
  else if (method === 8) raw = inflateRawSync(buf.subarray(dataStart, dataStart + compSize));
  else return [];

  const str = raw.toString("utf8");
  const paras: string[] = [];
  const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const tRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(str))) {
    const block = pm[1];
    const isList = /<w:numPr\b/i.test(block);
    let text = "";
    const local = new RegExp(tRe.source, tRe.flags);
    let tm: RegExpExecArray | null;
    while ((tm = local.exec(block))) text += decodeEntities(tm[1]);
    text = text.trim();
    if (text) paras.push(isList ? "• " + text : text);
  }
  return paras;
}

/** Xem trước nội dung file báo cáo (admin hoặc chính nhân viên, cần quyền download) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: Number(params.id) } });
  if (!report || !report.filePath) return NextResponse.json({ ok: false, error: "Không có file" }, { status: 404 });
  if (!(await canView(user, report))) return NextResponse.json({ ok: false, error: "Không có quyền xem" }, { status: 403 });

  const abs = path.resolve(process.cwd(), report.filePath);
  let data: Buffer;
  try {
    data = await readFile(abs);
  } catch {
    return NextResponse.json({ ok: false, error: "Không đọc được file" }, { status: 404 });
  }

  const ext = (report.fileName?.split(".").pop() || "").toLowerCase();

  if (ext === "docx") {
    const paragraphs = extractDocxParagraphs(data);
    if (paragraphs.length) return NextResponse.json({ ok: true, paragraphs, fileName: report.fileName, ext });
    return NextResponse.json({ ok: true, paragraphs: null, message: "Không trích xuất được văn bản từ file .docx này (có thể bị hỏng hoặc định dạng bất thường). Hãy dùng nút Tải về." });
  }

  if (ext === "txt" || ext === "md" || ext === "csv") {
    const paragraphs = data
      .toString("utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return NextResponse.json({ ok: true, paragraphs, fileName: report.fileName, ext });
  }

  return NextResponse.json({
    ok: true,
    paragraphs: null,
    message: `Định dạng .${ext || "file"} không hiển thị được nội dung trong trình duyệt. Hãy dùng nút Tải về để mở bằng ứng dụng phù hợp.`,
  });
}
