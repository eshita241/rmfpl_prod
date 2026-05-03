import { prisma } from "../config/prisma.js";

export function listCompanies() {
  return prisma.company.findMany({ orderBy: { name: "asc" } });
}
