import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { listDispatches } from "./dispatchService.js";
import { listEntries } from "./entryService.js";

type ReportEntry = Awaited<ReturnType<typeof listEntries>>[number];
type ReportDispatch = Awaited<ReturnType<typeof listDispatches>>[number];

type ReportFilters = {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  skuId?: string;
};

type ReportSku = {
  id: string;
  name: string;
  company: string;
};

type ReportRow = {
  date: string;
  batchNumber: number;
  entriesBySku: Map<string, ReportEntry>;
};

function damageQuantity(entry: ReportEntry) {
  const linkedDamages = entry.damageEntries ?? [];
  return linkedDamages.length > 0
    ? linkedDamages.reduce((total, damage) => total + damage.amount, 0)
    : entry.damages;
}

function isDateRange(filters: ReportFilters) {
  return !filters.startDate || !filters.endDate || filters.startDate !== filters.endDate;
}

function reportDate(entry: ReportEntry) {
  return entry.date.toISOString().slice(0, 10);
}

function groupRowsByDate(rows: ReportRow[]) {
  const groups = new Map<string, ReportRow[]>();
  rows.forEach((row) => {
    const dateRows = groups.get(row.date) ?? [];
    dateRows.push(row);
    groups.set(row.date, dateRows);
  });
  return Array.from(groups.entries());
}

function groupDispatchesByDate(dispatches: ReportDispatch[]) {
  const groups = new Map<string, ReportDispatch[]>();
  dispatches.forEach((dispatch) => {
    const date = dispatch.date.toISOString().slice(0, 10);
    const dateRows = groups.get(date) ?? [];
    dateRows.push(dispatch);
    groups.set(date, dateRows);
  });
  return groups;
}

function totalQuantity(rows: ReportRow[], skuId: string) {
  return rows.reduce((total, row) => total + (row.entriesBySku.get(skuId)?.quantityProduced ?? 0), 0);
}

function totalDamages(rows: ReportRow[], skuId: string) {
  return rows.reduce((total, row) => {
    const entry = row.entriesBySku.get(skuId);
    return total + (entry ? damageQuantity(entry) : 0);
  }, 0);
}

function buildWideReport(entries: ReportEntry[], dispatches: ReportDispatch[] = []) {
  const skus = Array.from(
    new Map(
      [
        ...entries.map((entry) => [
          entry.skuId,
          {
            id: entry.skuId,
            name: entry.sku.name,
            company: entry.company.name
          }
        ] as const),
        ...dispatches.map((dispatch) => [
          dispatch.skuId,
          {
            id: dispatch.skuId,
            name: dispatch.sku.name,
            company: dispatch.company.name
          }
        ] as const)
      ]
    ).values()
  ).sort((a, b) => `${a.company} ${a.name}`.localeCompare(`${b.company} ${b.name}`));

  const rowsByKey = new Map<string, ReportRow>();
  entries.forEach((entry) => {
    const date = reportDate(entry);
    const key = `${date}:${entry.batchNumber}`;
    const row = rowsByKey.get(key) ?? {
      date,
      batchNumber: entry.batchNumber,
      entriesBySku: new Map<string, ReportEntry>()
    };
    row.entriesBySku.set(entry.skuId, entry);
    rowsByKey.set(key, row);
  });

  const rows = Array.from(rowsByKey.values()).sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    return dateOrder || a.batchNumber - b.batchNumber;
  });

  return { skus, rows };
}

function styleSummaryRow(row: ExcelJS.Row, lastColumn: number, fillColor: string) {
  row.font = { bold: true, color: { argb: "FF000000" } };
  row.alignment = { horizontal: "center", vertical: "middle" };
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= lastColumn) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor }
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      };
    }
  });
}

function totalDispatches(dispatches: ReportDispatch[], skuId: string) {
  return dispatches.reduce((total, dispatch) => total + (dispatch.skuId === skuId ? dispatch.quantity : 0), 0);
}

type DispatchReportRow = {
  label: string;
  carNumber: string;
  sealNumber: string;
  time: string;
  dispatches: ReportDispatch[];
};

function formatDispatchTime(dispatch: ReportDispatch) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(dispatch.createdAt);
}

function buildDispatchRows(dispatches: ReportDispatch[]): DispatchReportRow[] {
  if (dispatches.length === 0) {
    return [{ label: "Dispatch", carNumber: "Dispatch", sealNumber: "", time: "", dispatches: [] }];
  }

  const groups = new Map<string, ReportDispatch[]>();
  dispatches.forEach((dispatch) => {
    const seal = dispatch.sealNumber?.trim() || "-";
    const key = `${dispatch.carNumber}|${seal}`;
    const rows = groups.get(key) ?? [];
    rows.push(dispatch);
    groups.set(key, rows);
  });

  return Array.from(groups.values())
    .map((rows) => {
      const first = rows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      const seal = first.sealNumber?.trim() || "-";
      const time = formatDispatchTime(first);
      return {
        label: [first.carNumber, `Seal ${seal}`, time].join(" | "),
        carNumber: first.carNumber,
        sealNumber: seal,
        time,
        dispatches: rows
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function buildExcelReport(filters: ReportFilters) {
  const [entries, dispatches] = await Promise.all([listEntries(filters), listDispatches(filters)]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bread Production");
  const includeDate = isDateRange(filters);
  const { skus, rows } = buildWideReport(entries, dispatches);
  const dispatchesByDate = groupDispatchesByDate(dispatches);
  const rowGroups = groupRowsByDate(rows);
  for (const date of dispatchesByDate.keys()) {
    if (!rowGroups.some(([rowDate]) => rowDate === date)) rowGroups.push([date, []]);
  }
  rowGroups.sort(([a], [b]) => a.localeCompare(b));
  const lastColumn = (includeDate ? 1 : 0) + 1 + skus.length * 2 + 1;

  let column = 1;
  if (includeDate) {
    sheet.getCell(1, column).value = "Date";
    sheet.mergeCells(1, column, 2, column);
    sheet.getColumn(column).width = 14;
    column += 1;
  }

  const labelColumn = column;
  sheet.getCell(1, column).value = "Batch Number";
  sheet.mergeCells(1, column, 2, column);
  sheet.getColumn(column).width = 18;
  column += 1;

  skus.forEach((sku) => {
    const firstColumn = column;
    sheet.getCell(1, firstColumn).value = sku.name;
    sheet.mergeCells(1, firstColumn, 1, firstColumn + 1);
    sheet.getCell(2, firstColumn).value = "Mould";
    sheet.getCell(2, firstColumn + 1).value = "(quantity of batch = mould * each mould stuff)";
    sheet.getColumn(firstColumn).width = 14;
    sheet.getColumn(firstColumn + 1).width = 36;
    column += 2;
  });

  sheet.getCell(1, column).value = "Time";
  sheet.mergeCells(1, column, 2, column);
  sheet.getColumn(column).width = 10;

  sheet.getRows(1, 2)?.forEach((row) => {
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  rowGroups.forEach(([date, dateRows]) => {
    dateRows.forEach((row, index) => {
      const values: (string | number | null)[] = [];
      if (includeDate) values.push(index === 0 ? date : null);
      values.push(row.batchNumber);

      skus.forEach((sku) => {
        const entry = row.entriesBySku.get(sku.id);
        values.push(entry?.mouldsUsed ?? null, entry?.quantityProduced ?? null);
      });
      values.push(null);

      sheet.addRow(values);
    });

    const totalValues: (string | number | null)[] = [];
    if (includeDate) totalValues.push(null);
    totalValues.push("Total Production");
    skus.forEach((sku) => totalValues.push(null, totalQuantity(dateRows, sku.id)));
    totalValues.push(null);
    styleSummaryRow(sheet.addRow(totalValues), lastColumn, "FF92D050");

    const dateDispatches = dispatchesByDate.get(date) ?? [];
    buildDispatchRows(dateDispatches).forEach((dispatchRow) => {
      const dispatchValues: (string | number | null)[] = [];
      if (includeDate) dispatchValues.push(null);
      dispatchValues.push(dispatchRow.carNumber);
      skus.forEach((sku, index) => {
        dispatchValues.push(index === 0 && dispatchRow.sealNumber ? `Seal ${dispatchRow.sealNumber}` : null, totalDispatches(dispatchRow.dispatches, sku.id));
      });
      dispatchValues.push(dispatchRow.time);
      const dispatchExcelRow = sheet.addRow(dispatchValues);
      styleSummaryRow(dispatchExcelRow, lastColumn, "FFBDD7EE");
      dispatchExcelRow.getCell(labelColumn).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    });

    const damageValues: (string | number | null)[] = [];
    if (includeDate) damageValues.push(null);
    damageValues.push("Damages");
    skus.forEach((sku) => damageValues.push(null, totalDamages(dateRows, sku.id)));
    damageValues.push(null);
    styleSummaryRow(sheet.addRow(damageValues), lastColumn, "FFF4B183");
  });

  return workbook.xlsx.writeBuffer();
}

function drawCell(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, height: number, bold = false) {
  doc.rect(x, y, width, height).stroke();
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(7).text(text, x + 3, y + 4, {
    width: width - 6,
    height: height - 6,
    align: "center"
  });
}

function drawPdfTable(doc: PDFKit.PDFDocument, rows: ReportRow[], skus: ReportSku[], includeDate: boolean, dispatches: ReportDispatch[] = []) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  let y = doc.y;
  const labelColumnWidth = 82;
  const fixedWidth = (includeDate ? 58 : 0) + labelColumnWidth;
  const skuColumnWidth = Math.max(8, (pageWidth - fixedWidth) / Math.max(skus.length * 2, 1));
  const headerHeight = 28;
  const rowHeight = 20;
  const rowGroups = groupRowsByDate(rows);
  const dispatchesByDate = groupDispatchesByDate(dispatches);
  for (const date of dispatchesByDate.keys()) {
    if (!rowGroups.some(([rowDate]) => rowDate === date)) rowGroups.push([date, []]);
  }
  rowGroups.sort(([a], [b]) => a.localeCompare(b));

  const drawHeader = () => {
    let x = startX;
    if (includeDate) {
      drawCell(doc, "Date", x, y, 58, headerHeight, true);
      x += 58;
    }
    drawCell(doc, "Batch Number", x, y, labelColumnWidth, headerHeight, true);
    x += labelColumnWidth;

    skus.forEach((sku) => {
      drawCell(doc, sku.name, x, y, skuColumnWidth * 2, 14, true);
      drawCell(doc, "Mould", x, y + 14, skuColumnWidth, 14, true);
      drawCell(doc, "Quantity", x + skuColumnWidth, y + 14, skuColumnWidth, 14, true);
      x += skuColumnWidth * 2;
    });
    y += headerHeight;
  };

  const drawReportRow = (dateText: string, label: string, values: Map<string, { mould: string; quantity: string }>, bold = false) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }

    let x = startX;
    if (includeDate) {
      drawCell(doc, dateText, x, y, 58, rowHeight, bold);
      x += 58;
    }
    drawCell(doc, label, x, y, labelColumnWidth, rowHeight, bold);
    x += labelColumnWidth;

    skus.forEach((sku) => {
      const value = values.get(sku.id);
      drawCell(doc, value?.mould ?? "", x, y, skuColumnWidth, rowHeight, bold);
      drawCell(doc, value?.quantity ?? "", x + skuColumnWidth, y, skuColumnWidth, rowHeight, bold);
      x += skuColumnWidth * 2;
    });
    y += rowHeight;
  };

  drawHeader();

  rowGroups.forEach(([date, dateRows]) => {
    dateRows.forEach((row, index) => {
      const values = new Map<string, { mould: string; quantity: string }>();
      skus.forEach((sku) => {
        const entry = row.entriesBySku.get(sku.id);
        values.set(sku.id, {
          mould: entry ? String(entry.mouldsUsed) : "",
          quantity: entry ? String(entry.quantityProduced) : ""
        });
      });
      drawReportRow(index === 0 ? date : "", String(row.batchNumber), values);
    });

    const totalValues = new Map<string, { mould: string; quantity: string }>();
    skus.forEach((sku) => totalValues.set(sku.id, { mould: "", quantity: String(totalQuantity(dateRows, sku.id)) }));
    drawReportRow("", "Total Production", totalValues, true);

    const dateDispatches = dispatchesByDate.get(date) ?? [];
    buildDispatchRows(dateDispatches).forEach((dispatchRow) => {
      const dispatchValues = new Map<string, { mould: string; quantity: string }>();
      skus.forEach((sku) => dispatchValues.set(sku.id, { mould: "", quantity: String(totalDispatches(dispatchRow.dispatches, sku.id)) }));
      drawReportRow("", dispatchRow.label, dispatchValues, true);
    });

    const damageValues = new Map<string, { mould: string; quantity: string }>();
    skus.forEach((sku) => damageValues.set(sku.id, { mould: "", quantity: String(totalDamages(dateRows, sku.id)) }));
    drawReportRow("", "Damages", damageValues, true);
  });
}

export async function buildPdfReport(filters: ReportFilters) {
  const [entries, dispatches] = await Promise.all([listEntries(filters), listDispatches(filters)]);
  const doc = new PDFDocument({ margin: 24, size: "A4", layout: "landscape" });
  const chunks: Buffer[] = [];
  const includeDate = isDateRange(filters);
  const { skus, rows } = buildWideReport(entries, dispatches);

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.fontSize(18).text("Production Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).text(`Period: ${filters.startDate ?? "All"} to ${filters.endDate ?? "All"}`);
  doc.moveDown();

  drawPdfTable(doc, rows, skus, includeDate, dispatches);

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
