import type { Request, Response } from "express";
import { z } from "zod";
import { listCompanies } from "../services/companyService.js";
import { listLogs } from "../services/logService.js";
import { buildExcelReport, buildPdfReport } from "../services/reportService.js";

function reportFileName(query: { startDate?: string; endDate?: string }, extension: "xlsx" | "pdf") {
  const datePart =
    query.startDate && query.endDate
      ? query.startDate === query.endDate
        ? query.startDate
        : `${query.startDate}_to_${query.endDate}`
      : query.startDate ?? query.endDate ?? "all_dates";

  return `${datePart}_Bread_production.${extension}`;
}

export async function getCompanies(_req: Request, res: Response) {
  res.json(await listCompanies());
}

export async function getLogs(req: Request, res: Response) {
  res.json(await listLogs({ date: req.query.date as string | undefined, role: req.user!.role }));
}

export async function downloadApp(_req: Request, res: Response) {
  const content = Buffer.from(
    "This simulates a ZIP download of the latest frontend build. Run `npm run build` in frontend for the deploy artifact."
  );
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=production-app-build.zip");
  res.send(content);
}

export async function getReport(req: Request, res: Response) {
  const query = z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      companyId: z.string().optional(),
      skuId: z.string().optional(),
      format: z.enum(["pdf", "excel"]).default("excel")
    })
    .parse(req.query);

  if (query.format === "pdf") {
    const pdf = await buildPdfReport(query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${reportFileName(query, "pdf")}`);
    return res.send(pdf);
  }

  const excel = await buildExcelReport(query);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${reportFileName(query, "xlsx")}`);
  return res.send(Buffer.from(excel));
}
