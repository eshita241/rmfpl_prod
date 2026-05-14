import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, CheckCircle2, Pencil, Save } from "lucide-react";
import { createDamage, deleteDamage, getDamages, getEntries, updateDamage } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { SelectField } from "../components/SelectField";
import type { DamageEntry, ProductionEntry } from "../types/domain";
import { formatIst } from "../utils/time";
import { ApiError } from "../api/client";
import { localDateInputValue } from "../utils/date";

const today = localDateInputValue();

type SavedDamage = {
  amount: number;
  batch: string;
  companyName: string;
  skuName: string;
  date: string;
};

type DamageOption = {
  key: string;
  companyName: string;
  skuName: string;
  totalQuantity: number;
  damagedQuantity: number;
  remainingQuantity: number;
  entries: ProductionEntry[];
};

type DamageSummary = {
  key: string;
  amount: number;
  companyName: string;
  skuName: string;
  reason: string;
  createdAt: string;
  entries: DamageEntry[];
};

export function Damages({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: today,
    productionEntryId: "",
    amount: "",
    reason: ""
  });
  const [savedDamage, setSavedDamage] = useState<SavedDamage | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [damageToEdit, setDamageToEdit] = useState<DamageEntry | null>(null);
  const [editForm, setEditForm] = useState({ date: today, productionEntryId: "", amount: "", reason: "" });
  const [damageToArchive, setDamageToArchive] = useState<DamageEntry | null>(null);

  const entries = useQuery({ queryKey: ["entries", form.date, form.date], queryFn: () => getEntries(form.date, form.date) });
  const editEntries = useQuery({
    queryKey: ["entries", editForm.date, editForm.date, "damage-edit"],
    queryFn: () => getEntries(editForm.date, editForm.date),
    enabled: Boolean(damageToEdit)
  });
  const damages = useQuery({ queryKey: ["damages", form.date], queryFn: () => getDamages(form.date, form.date) });
  const damageOptions = buildDamageOptions(entries.data ?? []);
  const selectedOption = damageOptions.find((option) => option.key === form.productionEntryId);
  const damageSummaries = buildDamageSummaries(damages.data ?? []);
  const selectedDateIsClosed = !isAdmin && form.date !== today;

  const mutation = useMutation({
    mutationFn: createDailySkuDamage,
    onSuccess: (createdDamages) => {
      const firstDamage = createdDamages[0];
      if (!firstDamage) return;
      setSavedDamage({
        amount: createdDamages.reduce((total, damage) => total + damage.amount, 0),
        batch: "Daily SKU total",
        companyName: firstDamage.company.name,
        skuName: firstDamage.sku.name,
        date: firstDamage.date.slice(0, 10)
      });
      setForm((current) => ({ ...current, amount: "", reason: "" }));
      queryClient.invalidateQueries({ queryKey: ["damages"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        setErrors(fieldErrors(error.issues));
      }
      setErrorModal(error.message);
    }
  });
  const editMutation = useMutation({
    mutationFn: (body: { date: string; productionEntryId: string; amount: number; reason: string }) =>
      updateDamage(damageToEdit!.id, body),
    onSuccess: () => {
      setDamageToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["damages"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (error) => setErrorModal(error.message)
  });
  const archiveMutation = useMutation({
    mutationFn: deleteDamage,
    onSuccess: () => {
      setDamageToArchive(null);
      queryClient.invalidateQueries({ queryKey: ["damages"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    }
  });

  function submit() {
    setErrors({});
    const amount = Number(form.amount);
    const alreadyDamaged = selectedOption?.damagedQuantity ?? 0;
    const remaining = selectedOption?.remainingQuantity ?? 0;

    if (selectedOption && amount > remaining) {
      setErrorModal(
        `Damage quantity cannot be more than production quantity. Produced: ${selectedOption.totalQuantity}. Already damaged: ${alreadyDamaged}. Remaining allowed: ${Math.max(remaining, 0)}.`
      );
      return;
    }

    if (!selectedOption) return;

    mutation.mutate({
      date: form.date,
      option: selectedOption,
      amount,
      reason: form.reason
    });
  }

  function startEdit(damage: DamageEntry) {
    setDamageToEdit(damage);
    setEditForm({
      date: damage.date.slice(0, 10),
      productionEntryId: damage.productionEntryId ?? "",
      amount: String(damage.amount),
      reason: damage.reason
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Damages</h2>
        <p className="text-ink/65">Record damaged quantity against the SKU total for the selected day.</p>
      </div>

      <section className="rounded-md border border-line bg-field p-4 shadow-sm">
        <h3 className="text-xl font-bold text-ink">Log Damage</h3>
        {selectedDateIsClosed ? (
          <div className="mt-4 rounded-md border border-line bg-field p-4 font-semibold text-ink">
            This day has ended. You can view previous damage data, but only admins can add damage entries for previous dates.
          </div>
        ) : null}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Date" type="date" error={errors.date} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Field label="Amount Damaged" type="number" inputMode="numeric" error={errors.amount} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>

        <div className="mt-5">
          <SelectField
            label="SKU Produced Today"
            value={form.productionEntryId}
            onChange={(e) => setForm({ ...form, productionEntryId: e.target.value })}
            options={[
              { label: "Select SKU", value: "" },
              ...damageOptions.map((option) => ({
                label: `${option.skuName} | ${option.companyName} | Produced ${option.totalQuantity} | Remaining ${option.remainingQuantity}`,
                value: option.key
              }))
            ]}
          />
          {entries.data?.length === 0 ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
              No production entries found for this date. Create a production entry first.
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="block">
            <span className={`mb-2 block text-sm font-semibold ${errors.reason ? "text-red-700" : "text-ink"}`}>Notes <span className="font-normal text-ink/55">(reason, batch info, etc.)</span></span>
            <textarea className={`min-h-28 w-full rounded-md border bg-field px-4 py-3 text-lg text-ink outline-none ${errors.reason ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200" : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"}`} placeholder="Reason for damage, batch info, etc..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            {errors.reason ? <span className="mt-2 block text-sm font-semibold text-red-700">{errors.reason}</span> : null}
          </label>
        </div>

        {selectedOption ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
            Recording damage for {selectedOption.skuName}, {selectedOption.companyName}. Total produced: {selectedOption.totalQuantity}. Remaining allowed: {selectedOption.remainingQuantity}.
          </div>
        ) : null}

        <Button tone="primary" className="mt-5 w-full text-lg" disabled={selectedDateIsClosed || mutation.isPending || !form.productionEntryId || !form.amount || !form.reason} onClick={submit}>
          <span className="inline-flex items-center gap-2"><Save size={22} /> Save Damage Entry</span>
        </Button>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-ink">Today / Selected Date</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {damageSummaries.map((summary) => (
            <article key={summary.key} className="rounded-md border border-line bg-field p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 text-action" size={24} />
                <div>
                  <strong>{summary.amount} damaged | {summary.skuName}</strong>
                  <p className="text-sm text-ink/65">{summary.companyName} | {formatIst(summary.createdAt)}</p>
                  <p className="mt-2 text-sm">{summary.reason}</p>
                  {isAdmin && summary.entries.length === 1 ? (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => startEdit(summary.entries[0])}><Pencil size={18} /></Button>
                      <Button tone="danger" onClick={() => setDamageToArchive(summary.entries[0])}><Archive size={18} /></Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {savedDamage ? (
        <Modal
          title="Damage Entry Saved"
          description="The damaged quantity has been recorded against the selected SKU total."
          icon={<CheckCircle2 className="text-brand" size={30} />}
          actions={<Button className="w-full" tone="primary" onClick={() => setSavedDamage(null)}>Done</Button>}
        >
          <dl className="grid gap-3 rounded-md border border-line bg-milk p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink/65">Date</dt>
              <dd className="font-bold text-ink">{savedDamage.date}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink/65">Batch</dt>
              <dd className="font-bold text-ink">{savedDamage.batch}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink/65">SKU</dt>
              <dd className="text-right font-bold text-ink">{savedDamage.skuName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink/65">Company</dt>
              <dd className="text-right font-bold text-ink">{savedDamage.companyName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-ink/65">Damaged</dt>
              <dd className="font-bold text-ink">{savedDamage.amount} pieces</dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      {errorModal ? (
        <Modal
          title="Check Damage Quantity"
          description={errorModal}
          icon={<AlertTriangle className="text-red-700" size={30} />}
          actions={<Button className="w-full" tone="primary" onClick={() => setErrorModal(null)}>OK</Button>}
        />
      ) : null}

      {damageToArchive ? (
        <Modal
          title="Archive Damage Entry?"
          description="This hides the damage entry from active reports, while keeping audit history intact."
          icon={<Archive className="text-red-700" size={30} />}
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setDamageToArchive(null)}>Cancel</Button>
              <Button tone="danger" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(damageToArchive.id)}>Archive</Button>
            </div>
          }
        />
      ) : null}

      {damageToEdit ? (
        <Modal
          title="Edit Damage Entry"
          description={`${damageToEdit.sku.name} | ${damageToEdit.company.name} | ${formatIst(damageToEdit.createdAt)}`}
          maxWidth="lg"
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setDamageToEdit(null)}>Cancel</Button>
              <Button tone="primary" disabled={editMutation.isPending || !editForm.productionEntryId || !editForm.amount || !editForm.reason} onClick={() => editMutation.mutate({ ...editForm, amount: Number(editForm.amount) })}>Save Changes</Button>
            </div>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Date" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            <Field label="Amount Damaged" type="number" inputMode="numeric" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
          </div>
          <div className="mt-5">
            <SelectField
              label="Production Entry"
              value={editForm.productionEntryId}
              onChange={(e) => setEditForm({ ...editForm, productionEntryId: e.target.value })}
              options={[
                { label: "Select production entry", value: "" },
                ...(editEntries.data ?? []).map((entry) => ({
                  label: `${entry.sku.name} | Batch ${entry.batchNumber} | Produced ${entry.quantityProduced}`,
                  value: entry.id
                }))
              ]}
            />
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-ink">Notes</span>
            <textarea className="min-h-28 w-full rounded-md border border-line bg-field px-4 py-3 text-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} />
          </label>
        </Modal>
      ) : null}
    </div>
  );
}

function fieldErrors(issues: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value[0] ?? "Check this field"]));
}

function remainingDamage(entry: {
  quantityProduced: number;
  damageEntries?: { amount: number }[];
}) {
  const damaged = entry.damageEntries?.reduce((total, damage) => total + damage.amount, 0) ?? 0;
  return Math.max(entry.quantityProduced - damaged, 0);
}

function buildDamageOptions(entries: ProductionEntry[]): DamageOption[] {
  const options = new Map<string, DamageOption>();

  entries.forEach((entry) => {
    const key = `${entry.date.slice(0, 10)}:${entry.companyId}:${entry.skuId}`;
    const existing = options.get(key);
    const damaged = entry.damageEntries?.reduce((total, damage) => total + damage.amount, 0) ?? 0;

    if (existing) {
      existing.totalQuantity += entry.quantityProduced;
      existing.damagedQuantity += damaged;
      existing.remainingQuantity += Math.max(entry.quantityProduced - damaged, 0);
      existing.entries.push(entry);
      return;
    }

    options.set(key, {
      key,
      companyName: entry.company.name,
      skuName: entry.sku.name,
      totalQuantity: entry.quantityProduced,
      damagedQuantity: damaged,
      remainingQuantity: Math.max(entry.quantityProduced - damaged, 0),
      entries: [entry]
    });
  });

  return [...options.values()].sort((first, second) => {
    const company = first.companyName.localeCompare(second.companyName);
    return company || first.skuName.localeCompare(second.skuName);
  });
}

function buildDamageSummaries(damages: DamageEntry[]): DamageSummary[] {
  const summaries = new Map<string, DamageSummary>();

  damages.forEach((damage) => {
    const key = `${damage.date.slice(0, 10)}:${damage.companyId}:${damage.skuId}:${damage.reason}`;
    const existing = summaries.get(key);

    if (existing) {
      existing.amount += damage.amount;
      existing.entries.push(damage);
      if (damage.createdAt < existing.createdAt) existing.createdAt = damage.createdAt;
      return;
    }

    summaries.set(key, {
      key,
      amount: damage.amount,
      companyName: damage.company.name,
      skuName: damage.sku.name,
      reason: damage.reason,
      createdAt: damage.createdAt,
      entries: [damage]
    });
  });

  return [...summaries.values()].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

async function createDailySkuDamage(input: { date: string; option: DamageOption; amount: number; reason: string }) {
  let remainingToAllocate = input.amount;
  const createdDamages: DamageEntry[] = [];

  for (const entry of input.option.entries) {
    const entryRemaining = remainingDamage(entry);
    const amount = Math.min(remainingToAllocate, entryRemaining);
    if (amount <= 0) continue;

    createdDamages.push(
      await createDamage({
        date: input.date,
        productionEntryId: entry.id,
        amount,
        reason: input.reason
      })
    );
    remainingToAllocate -= amount;

    if (remainingToAllocate === 0) break;
  }

  if (remainingToAllocate > 0) {
    throw new Error(`Damage quantity cannot exceed remaining production quantity. Remaining allowed: ${input.option.remainingQuantity}.`);
  }

  return createdDamages;
}
