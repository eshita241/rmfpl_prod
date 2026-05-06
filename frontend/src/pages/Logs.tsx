import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getLogs } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import type { Log } from "../types/domain";
import { localDateInputValue } from "../utils/date";
import { formatIst } from "../utils/time";

export function Logs() {
  const [date, setDate] = useState(localDateInputValue());
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const logs = useQuery({ queryKey: ["logs", date], queryFn: () => getLogs(date || undefined) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink">Logs</h2>
        <Field label="Filter by Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-field shadow-sm">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-milk text-sm uppercase text-ink/70">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Action</th>
              <th className="p-3">Record</th>
              <th className="p-3">Changed By</th>
              <th className="p-3">Previous</th>
              <th className="p-3">New</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {(logs.data ?? []).map((log) => (
              <tr key={log.id} className="border-t border-line align-top">
                <td className="p-3 whitespace-nowrap text-sm">{formatIst(log.timestamp)}</td>
                <td className="p-3">
                  <span className={`rounded-md px-2 py-1 text-sm font-bold ${badgeColor(log.actionType)}`}>
                    {log.actionType}
                  </span>
                </td>
                <td className="p-3">
                  <strong>{log.entity}</strong>
                  <div className="text-sm text-ink/65">{recordName(log)}</div>
                </td>
                <td className="p-3">
                  <strong>{log.performer.name}</strong>
                  <div className="text-sm text-ink/65">{log.performer.email}</div>
                </td>
                <td className="p-3 text-sm text-ink/75">{summarizeValue(log.changes.previousValues)}</td>
                <td className="p-3 text-sm text-ink/75">{summarizeValue(log.changes.newValues)}</td>
                <td className="p-3">
                  <Button onClick={() => setSelectedLog(log)}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.data?.length === 0 ? <div className="p-5 text-center font-semibold text-ink/65">No logs found.</div> : null}
      </div>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <section className="w-full max-w-3xl rounded-md border border-line bg-field p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-ink">{selectedLog.actionType} {selectedLog.entity}</h3>
                <p className="text-sm text-ink/65">{formatIst(selectedLog.timestamp)}</p>
              </div>
              <Button onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailBlock title="Previous" value={hideShift(selectedLog.changes.previousValues)} />
              <DetailBlock title="New" value={hideShift(selectedLog.changes.newValues)} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function badgeColor(action: Log["actionType"]) {
  if (action === "CREATE") return "bg-green-100 text-green-800";
  if (action === "UPDATE") return "bg-blue-100 text-blue-800";
  return "bg-red-100 text-red-800";
}

function recordName(log: Log) {
  const value = (log.changes.newValues ?? log.changes.previousValues) as Record<string, unknown> | null;
  if (!value || typeof value !== "object") return log.entity;

  if (log.entity === "SKU") return String(value.name ?? "SKU");
  if (log.entity === "USER_ROLE") return String(value.email ?? "User role");
  if (log.entity === "ENTRY" || log.entity === "DAMAGE") {
    const sku = value.sku as Record<string, unknown> | undefined;
    const company = value.company as Record<string, unknown> | undefined;
    return [company?.name, sku?.name].filter(Boolean).join(" | ") || log.entity;
  }

  return log.entity;
}

function summarizeValue(value: unknown) {
  if (!value) return "-";
  if (typeof value !== "object") return String(value);

  const item = value as Record<string, unknown>;
  const parts: string[] = [];

  if (item.role) parts.push(`Role: ${item.role}`);
  if (item.name) parts.push(`Name: ${item.name}`);
  if (item.quantityProduced) parts.push(`Qty: ${item.quantityProduced}`);
  if (item.amount) parts.push(`Damaged: ${item.amount}`);
  if (item.reason) parts.push(`Reason: ${item.reason}`);
  if (item.date) parts.push(`Date: ${String(item.date).slice(0, 10)}`);

  const sku = item.sku as Record<string, unknown> | undefined;
  const company = item.company as Record<string, unknown> | undefined;
  if (company?.name) parts.push(`Company: ${company.name}`);
  if (sku?.name) parts.push(`SKU: ${sku.name}`);

  return parts.length ? parts.join(" | ") : "Changed";
}

function hideShift(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hideShift);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "shift")
      .map(([key, item]) => [key, hideShift(item)])
  );
}

function DetailBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h4 className="mb-2 font-bold text-ink">{title}</h4>
      <pre className="max-h-96 overflow-auto rounded-md bg-paper p-3 text-xs text-ink">
        {value ? JSON.stringify(value, null, 2) : "-"}
      </pre>
    </div>
  );
}
