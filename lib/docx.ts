// ---------------------------------------------------------------------------
// Tạo file Word (.docx) KHÔNG cần thư viện ngoài:
//  - ZIP: tự dựng cấu trúc ZIP (local header + central directory + EOCD),
//    nén bằng zlib.deflateRawSync (method 8) — cùng tinh thần với parser docx
//    tự viết của dự án (trước đây ở preview route).
//  - OOXML: [Content_Types].xml + _rels + word/document.xml + word/styles.xml.
// Word mở file trực tiếp (không warning định dạng như file .doc kiểu HTML).
// ---------------------------------------------------------------------------
import { deflateRawSync, inflateRawSync } from "zlib";

export function escXml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---- CRC32 (bảng tra cứu, dùng cho entry ZIP) ----
let CRC_TABLE: Int32Array | null = null;
function getCrcTable(): Int32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  CRC_TABLE = t;
  return t;
}
function crc32(buf: Buffer): number {
  const t = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- Thời gian DOS cho entry ZIP ----
function dosDateTime() {
  const d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Dựng file ZIP chuẩn từ danh sách entry (đủ để Word nhận diện .docx) */
function zipFiles(entries: { name: string; data: Buffer }[]): Buffer {
  const { time, date } = dosDateTime();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const comp = deflateRawSync(e.data);
    const useComp = comp.length < e.data.length ? comp : e.data;
    const method = comp.length < e.data.length ? 8 : 0;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(useComp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    locals.push(local, useComp);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(useComp.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += local.length + useComp.length;
  }

  const cdBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, cdBuf, eocd]);
}

// ---- Định dạng đoạn văn ----
export type DocxPara = {
  text: string;
  style?: "title" | "subtitle" | "h1" | "h2" | "h3" | "body" | "bullet" | "meta";
  align?: "left" | "center" | "right";
};

const STYLES: Record<string, { sz: number; bold?: boolean; italic?: boolean; color: string; before?: number; after?: number; ind?: number }> = {
  title: { sz: 32, bold: true, color: "111827", after: 80 },
  subtitle: { sz: 20, italic: true, color: "6B7280", after: 240 },
  h1: { sz: 28, bold: true, color: "111827", before: 280, after: 120 },
  h2: { sz: 26, bold: true, color: "1B4F8A", before: 220, after: 100 },
  h3: { sz: 24, bold: true, color: "374151", before: 140, after: 60 },
  body: { sz: 26, color: "1F2937", after: 120 },
  bullet: { sz: 26, color: "1F2937", after: 40, ind: 360 },
  meta: { sz: 20, italic: true, color: "6B7280", after: 80 },
};

function paraXml(p: DocxPara): string {
  const st = STYLES[p.style || "body"];
  let text = p.text ?? "";
  if (p.style === "bullet" && !/^[•\-–]\s/.test(text)) text = "• " + text;
  const align = p.align || (p.style === "title" || p.style === "subtitle" ? "center" : "left");
  const spacing = st.before || st.after ? `<w:spacing w:before="${st.before || 0}" w:after="${st.after || 0}"/>` : "";
  const ind = st.ind ? `<w:ind w:left="${st.ind}"/>` : "";
  const rpr = `${st.bold ? "<w:b/>" : ""}${st.italic ? "<w:i/>" : ""}<w:color w:val="${st.color}"/><w:sz w:val="${st.sz}"/><w:szCs w:val="${st.sz}"/>`;
  return `<w:p><w:pPr>${spacing}${ind}<w:jc w:val="${align}"/></w:pPr><w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;

/** Tạo file .docx từ danh sách đoạn văn — trả về Buffer (lưu StoredFile / trả client) */
export function buildDocx(paras: DocxPara[]): Buffer {
  const body = paras.map(paraXml).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zipFiles([
    { name: "[Content_Types].xml", data: Buffer.from(CONTENT_TYPES, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(ROOT_RELS, "utf8") },
    { name: "word/document.xml", data: Buffer.from(document, "utf8") },
    { name: "word/_rels/document.xml.rels", data: Buffer.from(DOC_RELS, "utf8") },
    { name: "word/styles.xml", data: Buffer.from(STYLES_XML, "utf8") },
  ]);
}

// ---- Trích ĐOẠN VĂN từ file .docx (chuyển từ preview route về đây dùng chung) ----
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Trích đoạn văn từ .docx không cần thư viện ngoài: EOCD → central directory →
 *  word/document.xml → giải nén zlib → duyệt <w:p> gom <w:t>, nhận biết gạch đầu dòng */
export function extractDocxParagraphs(buf: Buffer): string[] {
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

  const nameLen2 = buf.readUInt16LE(localOffset + 26);
  const extraLen2 = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen2 + extraLen2;

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