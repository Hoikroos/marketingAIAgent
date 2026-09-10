import { NextResponse } from "next/server";
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

/**
 * Xuất BÁO CÁO TỔNG HỢP của Báo cáo công việc ra file Excel (.xls) SpreadsheetML 2003.
 * Có bảng màu: tiêu đề xanh, hàng xen kẽ, trạng thái (Đã nộp xanh / Chưa nộp đỏ).
 * Admin xem tất cả; nhân viên chỉ xem báo cáo của mình.
 */
export async function GET() {
  const denied = await requirePermApi("reports_work_download");
  if (denied) return denied;

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { id: true, name: true } } },
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const total = reports.length;
  const submitted = reports.filter((r) => r.status === "Đã nộp").length;
  const notSubmitted = total - submitted;
  const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const styles = `
<Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="sTitle"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1b98e0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="sSub"><Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="sSummary"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/><Interior ss:Color="#E8F0FB" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D6EC"/></Borders></Style>
  <Style ss:ID="sHeader"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1b98e0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="sEven"><Font ss:Color="#1F2937"/><Interior ss:Color="#EEF4FB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DDE7F2"/></Borders></Style>
  <Style ss:ID="sOdd"><Font ss:Color="#1F2937"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DDE7F2"/></Borders></Style>
  <Style ss:ID="sDaNop"><Font ss:Bold="1" ss:Color="#065F46"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/></Borders></Style>
  <Style ss:ID="sChuaNop"><Font ss:Bold="1" ss:Color="#991B1B"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>
</Styles>`;

  const headerCells = ["STT", "Tiêu đề báo cáo", "Kỳ", "Nhân viên", "Trạng thái", "Ngày nộp", "File nộp"]
    .map((h) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join("");

  const body = reports
    .map((r, i) => {
      const rowStyle = i % 2 === 0 ? "sEven" : "sOdd";
      const statusStyle = r.status === "Đã nộp" ? "sDaNop" : "sChuaNop";
      const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "";
      const cells = [
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(r.title)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(r.periodLabel)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(r.employee?.name || "")}</Data></Cell>`,
        `<Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${esc(r.status)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(dateStr)}</Data></Cell>`,
        `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(r.fileName || "")}</Data></Cell>`,
      ].join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const emptyRow =
    reports.length === 0
      ? `<Row><Cell ss:StyleID="sEven" ss:MergeAcross="6"><Data ss:Type="String">Chưa có báo cáo công việc nào.</Data></Cell></Row>`
      : "";

  const summaryRow = `
  <Row>
    <Cell ss:StyleID="sSummary"><Data ss:Type="String">Tổng số</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="String">Đã nộp</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="Number">${submitted}</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="String">Chưa nộp</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="Number">${notSubmitted}</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="String">Tỷ lệ nộp</Data></Cell>
    <Cell ss:StyleID="sSummary"><Data ss:Type="String">${rate}%</Data></Cell>
  </Row>`;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${styles}
<Worksheet ss:Name="BaoCaoTongHop">
<Table>
  <Column ss:Width="42"/>
  <Column ss:Width="240"/>
  <Column ss:Width="120"/>
  <Column ss:Width="140"/>
  <Column ss:Width="110"/>
  <Column ss:Width="150"/>
  <Column ss:Width="180"/>
  <Row ss:Height="30"><Cell ss:MergeAcross="6" ss:StyleID="sTitle"><Data ss:Type="String">BÁO CÁO TỔNG HỢP BÁO CÁO CÔNG VIỆC</Data></Cell></Row>
  <Row><Cell ss:MergeAcross="6" ss:StyleID="sSub"><Data ss:Type="String">Xuất lúc ${now.toLocaleString("vi-VN")}</Data></Cell></Row>
  ${summaryRow}
  <Row>${headerCells}</Row>
  ${body}
  ${emptyRow}
</Table>
</Worksheet>
</Workbook>`;

  try {
    await logActivity("workreports", "export", `Xuất báo cáo tổng hợp công việc (${total} báo cáo)`);
  } catch {}

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="bao-cao-tong-hop-cong-viec-${stamp}.xls"`,
    },
  });
}

