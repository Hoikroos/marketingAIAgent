import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { logActivity } from "@/lib/activity";

function esc(v: any) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Màu nền theo trạng thái lead để file Excel nhìn rõ */
const STATUS_STYLE: Record<string, string> = {
  "Mới": "sMoi",
  "Đang tư vấn": "sTuVan",
  "Đã chốt": "sChot",
  "Không tiềm năng": "sKhong",
  "Quan tâm": "sQuanTam",
};

/** Parse "2026-9" -> { start, end } (đầu tháng -> đầu tháng sau), null nếu sai định dạng hoặc không truyền */
function parseMonthRange(month: string | null) {
  if (!month) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]); // 1-12
  if (mon < 1 || mon > 12) return null;
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);
  return { start, end, label: `Tháng ${mon}/${year}` };
}

/**
 * Xuất danh sách khách hàng tiềm năng ra file Excel (.xls) kiểu SpreadsheetML 2003.
 * Có bảng màu: tiêu đề xanh #1b98e0, hàng xen kẽ, và tô màu riêng theo trạng thái.
 * Hỗ trợ lọc theo tháng qua query ?month=YYYY-M (VD: ?month=2026-9). Không truyền -> xuất tất cả.
 * Không cần thư viện ngoài — Excel/WPS mở được trực tiếp.
 */
export async function GET(req: NextRequest) {
  const denied = await requirePermApi("leads_export");
  if (denied) return denied;

  const monthParam = req.nextUrl.searchParams.get("month");
  const range = parseMonthRange(monthParam);

  const leads = await prisma.lead.findMany({
    where: range ? { createdAt: { gte: range.start, lt: range.end } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  // Hậu tố cho tên file khi xuất theo 1 tháng cụ thể, VD: -thang-09-2026
  const fileSuffix = range ? `-thang-${pad(range.start.getMonth() + 1)}-${range.start.getFullYear()}` : "";

  const styles = `
<Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="sTitle"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1b98e0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="sSub"><Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="sHeader"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1b98e0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="sEven"><Font ss:Color="#1F2937"/><Interior ss:Color="#EEF4FB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DDE7F2"/></Borders></Style>
  <Style ss:ID="sOdd"><Font ss:Color="#1F2937"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DDE7F2"/></Borders></Style>
  <Style ss:ID="sMoi"><Font ss:Bold="1" ss:Color="#065F46"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/></Borders></Style>
  <Style ss:ID="sTuVan"><Font ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/></Borders></Style>
  <Style ss:ID="sChot"><Font ss:Bold="1" ss:Color="#5B21B6"/><Interior ss:Color="#EDE9FE" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/></Borders></Style>
  <Style ss:ID="sKhong"><Font ss:Bold="1" ss:Color="#991B1B"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>
  <Style ss:ID="sQuanTam"><Font ss:Bold="1" ss:Color="#1E40AF"/><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders></Style>
</Styles>`;

  const headerCells = ["STT", "Họ tên", "SĐT", "Nguồn", "Nội dung", "Đã liên hệ", "Trạng thái hồi đáp", "Trạng thái", "Ngày tạo"]
    .map((h) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join("");

  const body = leads
    .map((l, i) => {
      const rowStyle = i % 2 === 0 ? "sEven" : "sOdd";
      const statusStyle = STATUS_STYLE[l.status] || "sOdd";
      const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleDateString("vi-VN") : "";
      const cells = [
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.name)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.phone)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.source)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.purpose || "")}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.contacted || "")}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(l.responseStatus || "")}</Data></Cell>`,
        `<Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${esc(l.status)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(dateStr)}</Data></Cell>`,
      ].join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const emptyRow =
    leads.length === 0
      ? `<Row><Cell ss:StyleID="sEven" ss:MergeAcross="8"><Data ss:Type="String">Chưa có khách hàng tiềm năng nào.</Data></Cell></Row>`
      : "";

  const titleText = range ? `DANH SÁCH KHÁCH HÀNG TIỀM NĂNG — ${range.label.toUpperCase()}` : "DANH SÁCH KHÁCH HÀNG TIỀM NĂNG";
  const subText = range
    ? `Xuất lúc ${now.toLocaleString("vi-VN")} • ${range.label} • Tổng ${leads.length} khách hàng`
    : `Xuất lúc ${now.toLocaleString("vi-VN")} • Tổng ${leads.length} khách hàng`;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${styles}
<Worksheet ss:Name="KhachHangTiemNang">
<Table>
  <Column ss:Width="42"/>
  <Column ss:Width="240"/>
  <Column ss:Width="120"/>
  <Column ss:Width="90"/>
  <Column ss:Width="140"/>
  <Column ss:Width="130"/>
  <Column ss:Width="150"/>
  <Column ss:Width="140"/>
  <Column ss:Width="105"/>
  <Row ss:Height="30"><Cell ss:MergeAcross="8" ss:StyleID="sTitle"><Data ss:Type="String">${esc(titleText)}</Data></Cell></Row>
  <Row><Cell ss:MergeAcross="8" ss:StyleID="sSub"><Data ss:Type="String">${esc(subText)}</Data></Cell></Row>
  <Row>${headerCells}</Row>
  ${body}
  ${emptyRow}
</Table>
</Worksheet>
</Workbook>`;

  try {
    await logActivity(
      "leads",
      "export",
      range
        ? `Xuất Excel danh sách ${leads.length} khách hàng tiềm năng (${range.label})`
        : `Xuất Excel danh sách ${leads.length} khách hàng tiềm năng`
    );
  } catch {}

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="khach-hang-tiem-nang${fileSuffix}-${stamp}.xls"`,
    },
  });
}