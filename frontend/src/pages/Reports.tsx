import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Package, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { downloadUrl } from "../api/client";
import { deleteEntry, getCompanies, getEntries, getSkus, updateEntry } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { SelectField } from "../components/SelectField";
import type { ProductionEntry } from "../types/domain";
import { currentWeekRange, localDateInputValue } from "../utils/date";
import { formatIst } from "../utils/time";

export function Reports({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"single" | "week" | "range">("single");
  const [startDate, setStartDate] = useState(localDateInputValue());
  const [endDate, setEndDate] = useState(localDateInputValue());
  const [downloadFormat, setDownloadFormat] = useState<"excel" | "pdf">("excel");
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [filters, setFilters] = useState({ companyId: "", skuId: "" });
  const [selectedSummarySkuId, setSelectedSummarySkuId] = useState("");
  const [logsVisible, setLogsVisible] = useState(true);
  const [entryToEdit, setEntryToEdit] = useState<ProductionEntry | null>(null);
  const [entryToArchive, setEntryToArchive] = useState<ProductionEntry | null>(null);
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", filters.companyId], queryFn: () => getSkus(filters.companyId || undefined) });
  const entries = useQuery({ queryKey: ["entries", startDate, endDate, filters], queryFn: () => getEntries(startDate, endDate, filters) });
  const skuSummaries = useMemo(() => buildSkuSummaries(entries.data ?? []), [entries.data]);
  const tableEntries = useMemo(
    () => selectedSummarySkuId ? (entries.data ?? []).filter((entry) => entry.skuId === selectedSummarySkuId) : entries.data ?? [],
    [entries.data, selectedSummarySkuId]
  );
  const selectedSummary = skuSummaries.find((summary) => summary.skuId === selectedSummarySkuId);
  const editMutation = useMutation({
    mutationFn: (body: ReturnType<typeof entryPayload>) => updateEntry(body.id, body.payload),
    onSuccess: () => {
      setEntryToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    }
  });
  const archiveMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      setEntryToArchive(null);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    }
  });

  function changePeriod(nextPeriod: "single" | "week" | "range") {
    setPeriod(nextPeriod);
    if (nextPeriod === "single") {
      const today = localDateInputValue();
      setStartDate(today);
      setEndDate(today);
    }
    if (nextPeriod === "week") {
      const week = currentWeekRange();
      setStartDate(week.startDate);
      setEndDate(week.endDate);
    }
  }

  function download(format: "excel" | "pdf") {
    const params = new URLSearchParams({ startDate, endDate, format });
    if (filters.companyId) params.set("companyId", filters.companyId);
    if (filters.skuId) params.set("skuId", filters.skuId);
    window.location.href = downloadUrl(`/reports?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-ink">Reports</h2>
      <section className="rounded-md border border-line bg-field p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField
            label="Report Period"
            value={period}
            onChange={(e) => changePeriod(e.target.value as "single" | "week" | "range")}
            options={[
              { label: "Single date", value: "single" },
              { label: "This week", value: "week" },
              { label: "Custom range", value: "range" }
            ]}
          />
          {period === "range" ? (
            <>
              <Field label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Field label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          ) : (
            <Field
              label={period === "week" ? "Week Starting" : "Report Date"}
              type="date"
              value={startDate}
              disabled={period === "week"}
              onChange={(e) => {
                setStartDate(e.target.value);
                setEndDate(e.target.value);
              }}
            />
          )}
          <SelectField
            label="Download Format"
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value as "excel" | "pdf")}
            options={[
              { label: "Excel (.xlsx)", value: "excel" },
              { label: "PDF", value: "pdf" }
            ]}
          />
          <Button className="self-end" tone="primary" onClick={() => setConfirmDownload(true)}>
            <span className="inline-flex items-center gap-2"><Download size={20} /> Download</span>
          </Button>
        </div>
      </section>
      <section className="rounded-md border border-line bg-field p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Company"
            value={filters.companyId}
            onChange={(e) => {
              setSelectedSummarySkuId("");
              setFilters({ ...filters, companyId: e.target.value, skuId: "" });
            }}
            options={[
              { label: "All companies", value: "" },
              ...(companies.data ?? []).map((company) => ({ label: company.name, value: company.id }))
            ]}
          />
          <SelectField
            label="SKU / Bread Variant"
            value={filters.skuId}
            onChange={(e) => {
              setSelectedSummarySkuId("");
              setFilters({ ...filters, skuId: e.target.value });
            }}
            options={[
              { label: "All variants", value: "" },
              ...(skus.data ?? []).map((sku) => ({ label: sku.name, value: sku.id }))
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-ink">SKU Totals</h3>
          <div className="flex flex-wrap gap-2">
            {selectedSummarySkuId || !logsVisible ? (
              <Button onClick={() => {
                setSelectedSummarySkuId("");
                setLogsVisible(true);
              }}>
                Show All Logs
              </Button>
            ) : null}
            {logsVisible ? <Button onClick={() => setLogsVisible(false)}>Hide All Logs</Button> : null}
          </div>
        </div>
        {skuSummaries.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skuSummaries.map((summary) => (
              <button
                key={summary.skuId}
                className={`min-h-32 rounded-md border p-4 text-left transition ${
                  selectedSummarySkuId === summary.skuId ? "border-action bg-brand shadow-sm" : "border-line bg-field hover:border-brand"
                }`}
                onClick={() => {
                  setSelectedSummarySkuId(summary.skuId);
                  setLogsVisible(true);
                }}
              >
                <div className="flex items-start gap-3">
                  <Package className="mt-1 shrink-0 text-action" size={22} />
                  <div className="min-w-0">
                    <span className="block truncate text-base font-bold text-ink">{summary.skuName}</span>
                    <span className="mt-1 block text-sm font-semibold text-ink/65">{summary.companyName}</span>
                  </div>
                </div>
                <strong className="mt-4 block text-3xl text-ink">{summary.quantityProduced}</strong>
                <span className="mt-1 block text-sm font-semibold text-ink/65">{summary.entryCount} logs</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-line bg-field p-4 font-semibold text-ink/65">
            No SKU totals found for this date filter.
          </div>
        )}
      </section>

      {logsVisible ? (
        <div className="overflow-x-auto rounded-md border border-line bg-field">
          <div className="border-b border-line p-3 font-semibold text-ink">
            {selectedSummary ? `${selectedSummary.skuName} logs` : "All logs"}
          </div>
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-paper text-sm uppercase text-ink/70">
              <tr>
                <th className="p-3">Date</th><th>Created (IST)</th><th>Company</th><th>SKU</th><th>Batch</th><th>Quantity</th><th>Damages</th><th>Net</th><th>Reason</th>
                {isAdmin ? <th>Admin</th> : null}
              </tr>
            </thead>
            <tbody>
              {tableEntries.map((entry) => (
                <ReportRow key={entry.id} entry={entry} isAdmin={isAdmin} onEdit={setEntryToEdit} onArchive={setEntryToArchive} />
              ))}
            </tbody>
          </table>
          {tableEntries.length === 0 ? <div className="p-5 text-center font-semibold text-ink/65">No logs found.</div> : null}
        </div>
      ) : null}

      {entryToEdit ? (
        <EntryEditor
          entry={entryToEdit}
          onClose={() => setEntryToEdit(null)}
          onSave={(entry) => editMutation.mutate(entryPayload(entry))}
          saving={editMutation.isPending}
        />
      ) : null}

      {entryToArchive ? (
        <Modal
          title="Archive Entry?"
          description="This hides the entry from reports and new damage selection. Audit history stays intact."
          icon={<Archive className="text-red-700" size={30} />}
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setEntryToArchive(null)}>Cancel</Button>
              <Button tone="danger" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(entryToArchive.id)}>Archive</Button>
            </div>
          }
        />
      ) : null}

      {confirmDownload ? (
        <Modal
          title="Download Report?"
          description={`This will download a ${downloadFormat === "excel" ? "Excel" : "PDF"} report from ${startDate} to ${endDate}.`}
          icon={<Download className="text-brand" size={30} />}
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setConfirmDownload(false)}>Cancel</Button>
              <Button tone="primary" onClick={() => {
                setConfirmDownload(false);
                download(downloadFormat);
              }}>
                Download
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}

function buildSkuSummaries(entries: ProductionEntry[]) {
  return Array.from(
    entries.reduce((summaries, entry) => {
      const current = summaries.get(entry.skuId) ?? {
        skuId: entry.skuId,
        skuName: entry.sku.name,
        companyName: entry.company.name,
        quantityProduced: 0,
        entryCount: 0
      };
      current.quantityProduced += entry.quantityProduced;
      current.entryCount += 1;
      summaries.set(entry.skuId, current);
      return summaries;
    }, new Map<string, { skuId: string; skuName: string; companyName: string; quantityProduced: number; entryCount: number }>())
      .values()
  ).sort((a, b) => `${a.companyName} ${a.skuName}`.localeCompare(`${b.companyName} ${b.skuName}`));
}

function ReportRow({
  entry,
  isAdmin,
  onEdit,
  onArchive
}: {
  entry: ProductionEntry;
  isAdmin: boolean;
  onEdit: (entry: ProductionEntry) => void;
  onArchive: (entry: ProductionEntry) => void;
}) {
  const damages = damageSummary(entry);

  return (
    <tr className="border-t border-line">
      <td className="p-3">{entry.date.slice(0, 10)}</td>
      <td>{formatIst(entry.createdAt)}</td>
      <td>{entry.company.name}</td>
      <td>{entry.sku.name}</td>
      <td>Batch {entry.batchNumber}</td>
      <td>{entry.quantityProduced}</td>
      <td>{damages.amount}</td>
      <td>{entry.quantityProduced - damages.amount}</td>
      <td>{damages.reason || "-"}</td>
      {isAdmin ? (
        <td>
          <div className="flex gap-2">
            <Button onClick={() => onEdit(entry)}><Pencil size={18} /></Button>
            <Button tone="danger" onClick={() => onArchive(entry)}><Archive size={18} /></Button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function damageSummary(entry: ProductionEntry) {
  const linkedDamages = entry.damageEntries ?? [];
  if (linkedDamages.length === 0) {
    return { amount: entry.damages, reason: entry.damageReason ?? "" };
  }

  return {
    amount: linkedDamages.reduce((total, damage) => total + damage.amount, 0),
    reason: linkedDamages.map((damage) => `${damage.amount}: ${damage.reason}`).join("; ")
  };
}

function EntryEditor({
  entry,
  onClose,
  onSave,
  saving
}: {
  entry: ProductionEntry;
  onClose: () => void;
  onSave: (entry: ProductionEntry) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(entry);

  return (
    <Modal
      title="Edit Production Entry"
      maxWidth="md"
      actions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" disabled={saving} onClick={() => onSave(draft)}>Save</Button>
        </div>
      }
    >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Date" type="date" value={draft.date.slice(0, 10)} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <Field label="Quantity" type="number" value={String(draft.quantityProduced)} onChange={(e) => setDraft({ ...draft, quantityProduced: Number(e.target.value) })} />
          <Field label="Moulds Used" type="number" value={String(draft.mouldsUsed)} onChange={(e) => setDraft({ ...draft, mouldsUsed: Number(e.target.value) })} />
          <Field label="Empty Slots Per Mould" type="number" value={String(draft.emptySlotsPerMould)} onChange={(e) => setDraft({ ...draft, emptySlotsPerMould: Number(e.target.value) })} />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-ink">Notes</span>
          <textarea className="min-h-24 w-full rounded-md border border-line bg-field px-4 py-3 text-base" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
    </Modal>
  );
}

function entryPayload(entry: ProductionEntry) {
  return {
    id: entry.id,
    payload: {
      date: entry.date.slice(0, 10),
      companyId: entry.companyId,
      skuId: entry.skuId,
      mouldsUsed: entry.mouldsUsed,
      emptySlotsPerMould: entry.emptySlotsPerMould,
      notes: entry.notes ?? ""
    }
  };
}
