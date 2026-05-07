import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, CheckCircle2, Pencil, Save } from "lucide-react";
import { createDamage, deleteDamage, getDamages, getEntries, updateDamage } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { SelectField } from "../components/SelectField";
import type { DamageEntry } from "../types/domain";
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
  const selectedEntry = entries.data?.find((entry) => entry.id === form.productionEntryId);
  const selectedDateIsClosed = !isAdmin && form.date !== today;

  const mutation = useMutation({
    mutationFn: createDamage,
    onSuccess: (damage) => {
      setSavedDamage({
        amount: damage.amount,
        batch: damageBatchLabel(damage),
        companyName: damage.company.name,
        skuName: damage.sku.name,
        date: damage.date.slice(0, 10)
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
    const alreadyDamaged =
      selectedEntry?.damageEntries?.reduce((total, damage) => total + damage.amount, 0) ?? 0;
    const remaining = selectedEntry ? selectedEntry.quantityProduced - alreadyDamaged : 0;

    if (selectedEntry && amount > remaining) {
      setErrorModal(
        `Damage quantity cannot be more than production quantity. Produced: ${selectedEntry.quantityProduced}. Already damaged: ${alreadyDamaged}. Remaining allowed: ${Math.max(remaining, 0)}.`
      );
      return;
    }

    mutation.mutate({
      ...form,
      amount
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
        <p className="text-ink/65">Record damaged quantity against the correct production batch.</p>
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
            label="Production Entry"
            value={form.productionEntryId}
            onChange={(e) => setForm({ ...form, productionEntryId: e.target.value })}
            options={[
              { label: "Select production entry", value: "" },
              ...(entries.data ?? []).map((entry) => ({
                label: `${entry.sku.name} | Batch ${entry.batchNumber} | ${entry.company.name} | Produced ${entry.quantityProduced}`,
                value: entry.id
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

        {selectedEntry ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
            Recording damage for {selectedEntry.sku.name}, Batch {selectedEntry.batchNumber}, {selectedEntry.company.name}. Remaining allowed: {remainingDamage(selectedEntry)}.
          </div>
        ) : null}

        <Button tone="primary" className="mt-5 w-full text-lg" disabled={selectedDateIsClosed || mutation.isPending || !form.productionEntryId || !form.amount || !form.reason} onClick={submit}>
          <span className="inline-flex items-center gap-2"><Save size={22} /> Save Damage Entry</span>
        </Button>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold text-ink">Today / Selected Date</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(damages.data ?? []).map((damage) => (
            <article key={damage.id} className="rounded-md border border-line bg-field p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 text-action" size={24} />
                <div>
                  <strong>{damage.amount} damaged | {damage.sku.name}</strong>
                  <p className="text-sm text-ink/65">{damage.company.name} | {damageBatchLabel(damage)} | {formatIst(damage.createdAt)}</p>
                  <p className="mt-2 text-sm">{damage.reason}</p>
                  {isAdmin ? (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => startEdit(damage)}><Pencil size={18} /></Button>
                      <Button tone="danger" onClick={() => setDamageToArchive(damage)}><Archive size={18} /></Button>
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
          description="The damaged quantity has been recorded against the selected production batch."
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

function damageBatchLabel(damage: DamageEntry) {
  return damage.productionEntry?.batchNumber ? `Batch ${damage.productionEntry.batchNumber}` : "Batch -";
}
