import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Pencil } from "lucide-react";
import { useState } from "react";
import { downloadUrl } from "../api/client";
import { deleteEntry, getCompanies, getEntries, getSkus, updateEntry } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import type { ProductionEntry } from "../types/domain";
import { formatIst } from "../utils/time";

export function Reports({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [filters, setFilters] = useState({ companyId: "", skuId: "", shift: "" });
  const [entryToEdit, setEntryToEdit] = useState<ProductionEntry | null>(null);
  const [entryToArchive, setEntryToArchive] = useState<ProductionEntry | null>(null);
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", filters.companyId], queryFn: () => getSkus(filters.companyId || undefined) });
  const entries = useQuery({ queryKey: ["entries", startDate, endDate, filters], queryFn: () => getEntries(startDate, endDate, filters) });
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

  function download(format: "excel" | "pdf") {
    const params = new URLSearchParams({ startDate, endDate, format });
    if (filters.companyId) params.set("companyId", filters.companyId);
    if (filters.skuId) params.set("skuId", filters.skuId);
    if (filters.shift) params.set("shift", filters.shift);
    window.location.href = downloadUrl(`/reports?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-ink">Reports</h2>
      <section className="grid gap-4 md:grid-cols-4">
        <Field label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Field label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button className="self-end" tone="primary" onClick={() => download("excel")}><span className="inline-flex items-center gap-2"><Download size={20} /> Excel</span></Button>
        <Button className="self-end" onClick={() => download("pdf")}><span className="inline-flex items-center gap-2"><Download size={20} /> PDF</span></Button>
      </section>
      <section className="rounded-md border border-line bg-field p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Button active={!filters.shift} onClick={() => setFilters({ ...filters, shift: "" })}>All Shifts</Button>
          {["Morning", "Evening", "Night"].map((shift) => (
            <Button key={shift} active={filters.shift === shift} onClick={() => setFilters({ ...filters, shift })}>{shift}</Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Button active={!filters.companyId} onClick={() => setFilters({ ...filters, companyId: "", skuId: "" })}>All Companies</Button>
          {(companies.data ?? []).map((company) => (
            <Button key={company.id} active={filters.companyId === company.id} onClick={() => setFilters({ ...filters, companyId: company.id, skuId: "" })}>{company.name}</Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Button active={!filters.skuId} onClick={() => setFilters({ ...filters, skuId: "" })}>All Variants</Button>
          {(skus.data ?? []).map((sku) => (
            <Button key={sku.id} active={filters.skuId === sku.id} onClick={() => setFilters({ ...filters, skuId: sku.id })}>{sku.name}</Button>
          ))}
        </div>
      </section>
      <div className="overflow-x-auto rounded-md border border-line bg-field">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-paper text-sm uppercase text-ink/70">
            <tr>
              <th className="p-3">Date</th><th>Created (IST)</th><th>Company</th><th>SKU</th><th>Batch</th><th>Shift</th><th>Quantity</th><th>Damages</th><th>Net</th><th>Reason</th>
              {isAdmin ? <th>Admin</th> : null}
            </tr>
          </thead>
          <tbody>
            {(entries.data ?? []).map((entry) => (
              <ReportRow key={entry.id} entry={entry} isAdmin={isAdmin} onEdit={setEntryToEdit} onArchive={setEntryToArchive} />
            ))}
          </tbody>
        </table>
      </div>

      {entryToEdit ? (
        <EntryEditor
          entry={entryToEdit}
          onClose={() => setEntryToEdit(null)}
          onSave={(entry) => editMutation.mutate(entryPayload(entry))}
          saving={editMutation.isPending}
        />
      ) : null}

      {entryToArchive ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <section className="w-full max-w-md rounded-md border border-line bg-field p-5 shadow-xl">
            <h3 className="text-xl font-bold text-ink">Archive Entry?</h3>
            <p className="mt-3 text-ink/75">This hides the entry from reports and new damage selection. Audit history stays intact.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={() => setEntryToArchive(null)}>Cancel</Button>
              <Button tone="danger" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(entryToArchive.id)}>Archive</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
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
      <td>{entry.shift}</td>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <section className="w-full max-w-2xl rounded-md border border-line bg-field p-5 shadow-xl">
        <h3 className="text-xl font-bold text-ink">Edit Production Entry</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Date" type="date" value={draft.date.slice(0, 10)} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <Field label="Shift" value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value })} />
          <Field label="Quantity" type="number" value={String(draft.quantityProduced)} onChange={(e) => setDraft({ ...draft, quantityProduced: Number(e.target.value) })} />
          <Field label="Moulds Used" type="number" value={String(draft.mouldsUsed)} onChange={(e) => setDraft({ ...draft, mouldsUsed: Number(e.target.value) })} />
          <Field label="Empty Slots Per Mould" type="number" value={String(draft.emptySlotsPerMould)} onChange={(e) => setDraft({ ...draft, emptySlotsPerMould: Number(e.target.value) })} />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-ink">Notes</span>
          <textarea className="min-h-24 w-full rounded-md border border-line bg-field px-4 py-3 text-base" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" disabled={saving} onClick={() => onSave(draft)}>Save</Button>
        </div>
      </section>
    </div>
  );
}

function entryPayload(entry: ProductionEntry) {
  return {
    id: entry.id,
    payload: {
      date: entry.date.slice(0, 10),
      shift: entry.shift,
      companyId: entry.companyId,
      skuId: entry.skuId,
      mouldsUsed: entry.mouldsUsed,
      emptySlotsPerMould: entry.emptySlotsPerMould
      ,notes: entry.notes ?? ""
    }
  };
}
