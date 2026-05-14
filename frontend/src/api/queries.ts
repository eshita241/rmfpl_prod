import { api } from "./client";
import type { Company, DamageEntry, Log, ProductionEntry, Sku, User } from "../types/domain";

export const getMe = () => api<{ user: User }>("/auth/me");
export const login = (body: { email: string; password: string }) =>
  api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) });
export const signup = (body: { name: string; email: string; password: string }) =>
  api<{ user: User }>("/auth/signup", { method: "POST", body: JSON.stringify(body) });
export const logout = () => api<void>("/auth/logout", { method: "POST" });
export const getCompanies = () => api<Company[]>("/companies");
export const getSkus = (companyId?: string, includeArchived = false) => {
  const params = new URLSearchParams();
  if (companyId) params.set("companyId", companyId);
  if (includeArchived) params.set("includeArchived", "true");
  return api<Sku[]>(`/sku${params.toString() ? `?${params.toString()}` : ""}`);
};
export const createEntry = (body: unknown) =>
  api<{ entry: ProductionEntry; totalCapacity: number; exceedsCapacity: boolean }>("/entries", {
    method: "POST",
    body: JSON.stringify(body)
  });
export const updateEntry = (id: string, body: unknown) =>
  api<ProductionEntry>(`/entries/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteEntry = (id: string) => api<void>(`/entries/${id}`, { method: "DELETE" });
export const getNextBatch = (date: string, skuId: string) =>
  api<{ batchNumber: number }>(`/entries/next-batch?date=${date}&skuId=${skuId}`);
export const createDamage = (body: unknown) =>
  api<DamageEntry[]>("/damages", {
    method: "POST",
    body: JSON.stringify(body)
  });
export const getDamages = (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return api<DamageEntry[]>(`/damages?${params.toString()}`);
};
export const updateDamage = (id: string, body: unknown) =>
  api<DamageEntry>(`/damages/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteDamage = (id: string) => api<void>(`/damages/${id}`, { method: "DELETE" });
export const getEntries = (startDate?: string, endDate?: string, filters: { companyId?: string; skuId?: string } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.skuId) params.set("skuId", filters.skuId);
  return api<ProductionEntry[]>(`/entries?${params.toString()}`);
};
export const getLogs = (date?: string) => api<Log[]>(`/logs${date ? `?date=${date}` : ""}`);
export const getUsers = () => api<User[]>("/users");
export const updateUserRole = (id: string, role: "ADMIN" | "USER") =>
  api<User>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
export const createSku = (body: unknown) => api<Sku>("/sku", { method: "POST", body: JSON.stringify(body) });
export const updateSku = (id: string, body: unknown) =>
  api<Sku>(`/sku/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteSku = (id: string) => api<void>(`/sku/${id}`, { method: "DELETE" });
