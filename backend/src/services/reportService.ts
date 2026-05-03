import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { listEntries } from "./entryService.js";

type ReportEntry = Awaited<ReturnType<typeof listEntries>>[number];

function damageSummary(entry: ReportEntry) {
  const linkedDamages = entry.damageEntries ?? [];
  const amount =
    linkedDamages.length > 0
      ? linkedDamages.reduce((total, damage) => total + damage.amount, 0)
      : entry.damages;
  const reason =
    linkedDamages.length > 0
      ? linkedDamages.map((damage) => `${damage.amount}: ${damage.reason}`).join("; ")
      : entry.damageReason ?? "";

  return { amount, reason };
}

function formatIst(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value);
}

type ReportFilters = {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  skuId?: string;
  shift?: string;
};

export async function buildExcelReport(filters: ReportFilters) {
  const entries = await listEntries(filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Production Report");

  sheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Company", key: "company", width: 20 },
    { header: "SKU", key: "sku", width: 24 },
    { header: "Batch", key: "batch", width: 12 },
    { header: "Shift", key: "shift", width: 14 },
    { header: "Production Quantity", key: "quantity", width: 22 },
    { header: "Damages", key: "damages", width: 12 },
    { header: "Net Quantity", key: "netQuantity", width: 16 },
    { header: "Damage Reason", key: "reason", width: 32 },
    { header: "Created At (IST)", key: "createdAt", width: 24 },
    { header: "Updated At (IST)", key: "updatedAt", width: 24 }
  ];
  sheet.getRow(1).font = { bold: true };

  entries.forEach((entry) => {
    const damages = damageSummary(entry);
    sheet.addRow({
      date: entry.date.toISOString().slice(0, 10),
      company: entry.company.name,
      sku: entry.sku.name,
      batch: entry.batchNumber,
      shift: entry.shift,
      quantity: entry.quantityProduced,
      damages: damages.amount,
      netQuantity: entry.quantityProduced - damages.amount,
      reason: damages.reason,
      createdAt: formatIst(entry.createdAt),
      updatedAt: formatIst(entry.updatedAt)
    });
  });

  return workbook.xlsx.writeBuffer();
}

export async function buildPdfReport(filters: ReportFilters) {
  const entries = await listEntries(filters);
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.fontSize(18).text("Production Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).text(`Period: ${filters.startDate ?? "All"} to ${filters.endDate ?? "All"}`);
  doc.moveDown();

  entries.forEach((entry) => {
    const damages = damageSummary(entry);
    doc
      .fontSize(10)
      .text(
        `${entry.date.toISOString().slice(0, 10)} | ${entry.company.name} | ${entry.sku.name} | Batch ${entry.batchNumber} | ${entry.shift} | Qty: ${entry.quantityProduced} | Damages: ${damages.amount} | Net: ${entry.quantityProduced - damages.amount} | ${damages.reason} | Created IST: ${formatIst(entry.createdAt)}`
      );
  });

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
