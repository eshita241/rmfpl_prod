import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { createEntry, getCompanies, getNextBatch, getSkus } from "../api/queries";
import type { Company, Sku } from "../types/domain";
import { ApiError } from "../api/client";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
const today = localToday();
const shifts = ["Morning", "Evening", "Night"];

type FormState = {
  date: string;
  shift: string;
  companyId: string;
  skuId: string;
  mouldsUsed: string;
  emptySlotsPerMould: string;
  notes: string;
};

const initialForm: FormState = {
  date: today,
  shift: "Morning",
  companyId: "",
  skuId: "",
  mouldsUsed: "",
  emptySlotsPerMould: "0",
  notes: ""
};

export function NewEntry() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => {
    return initialForm;
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", form.companyId], queryFn: () => getSkus(form.companyId), enabled: Boolean(form.companyId) });
  const selectedSku = useMemo(() => skus.data?.find((sku) => sku.id === form.skuId), [skus.data, form.skuId]);
  const totalCapacity = selectedSku ? Number(form.mouldsUsed || 0) * selectedSku.mouldCapacity : 0;
  const quantityProduced = selectedSku
    ? Math.max(Number(form.mouldsUsed || 0) * (selectedSku.mouldCapacity - Number(form.emptySlotsPerMould || 0)), 0)
    : 0;
  const nextBatch = useQuery({
    queryKey: ["next-batch", form.date, form.skuId],
    queryFn: () => getNextBatch(form.date, form.skuId),
    enabled: Boolean(form.date && form.skuId)
  });

  const mutation = useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      setMessage("Entry saved.");
      setErrors({});
      setForm((current) => ({ ...current, mouldsUsed: "", emptySlotsPerMould: "0", notes: "" }));
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues) {
        setErrors(fieldErrors(error.issues));
      }
      setMessage(error.message);
    }
  });

  function submit() {
    setMessage("");
    setErrors({});
    mutation.mutate({
      ...form,
      mouldsUsed: Number(form.mouldsUsed),
      emptySlotsPerMould: Number(form.emptySlotsPerMould),
      notes: form.notes
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">New Production Entry</h2>
          <p className="text-ink/65">Large controls, defaults, and checks for quick shop-floor entry.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Date" type="date" error={errors.date} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <div>
          <span className="mb-2 block text-sm font-semibold text-ink">Shift</span>
          <div className="grid grid-cols-3 gap-2">
            {shifts.map((shift) => (
              <Button key={shift} active={form.shift === shift} onClick={() => setForm({ ...form, shift })}>{shift}</Button>
            ))}
          </div>
        </div>
      </section>

      <Chooser title="Company" items={companies.data ?? []} selectedId={form.companyId} onSelect={(company) => setForm({ ...form, companyId: company.id, skuId: "" })} />

      <div>
        <span className="mb-2 block text-sm font-semibold text-ink">SKU</span>
        <div className="grid gap-3 md:grid-cols-3">
          {(skus.data ?? []).map((sku: Sku) => (
            <button
              key={sku.id}
              onClick={() => setForm({ ...form, skuId: sku.id })}
              className={`min-h-24 rounded-md border p-4 text-left ${form.skuId === sku.id ? "border-brand bg-brand text-white" : "border-line bg-field text-ink"}`}
            >
              <span className="block text-lg font-bold">{sku.name}</span>
              <span className="mt-1 block text-sm opacity-80">{sku.weight} g per piece | {sku.mouldCapacity} pieces per mould</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-md border border-line bg-field p-5 shadow-sm">
        <h3 className="text-xl font-bold text-ink">Mould Count</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
        <Field label="Moulds Used" type="number" inputMode="numeric" error={errors.mouldsUsed} value={form.mouldsUsed} onChange={(e) => setForm({ ...form, mouldsUsed: e.target.value })} />
            <p className="mt-2 text-sm text-ink/60">Total moulds in this run</p>
          </div>
          <div>
        <Field label="Empty Dough Slots" type="number" inputMode="numeric" error={errors.emptySlotsPerMould} value={form.emptySlotsPerMould} onChange={(e) => setForm({ ...form, emptySlotsPerMould: e.target.value })} />
            <p className="mt-2 text-sm text-ink/60">Slots with only 2/3 dough filled</p>
          </div>
        </div>
        <div className="my-6 border-t border-line" />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Notes <span className="font-normal text-ink/55">(optional)</span></span>
          <textarea
            className="min-h-32 w-full rounded-md border border-line bg-field px-4 py-3 text-lg text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Any observations, issues, or comments about this production run..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      </section>

      <section>
        <div className="rounded-md border border-line bg-milk p-4">
          <span className="block text-sm font-semibold text-ink/65">Calculated Quantity Produced</span>
          <strong className="mt-1 block text-3xl text-ink">{quantityProduced} pieces</strong>
          <span className="mt-1 block text-sm text-ink/65">
            Batch {nextBatch.data?.batchNumber ?? "-"} | {selectedSku ? `${selectedSku.weight} g per piece` : "Select SKU for weight"}
          </span>
        </div>
      </section>

      {selectedSku ? (
        <div className="rounded-md border border-line bg-field p-4 font-semibold text-ink">
          Total capacity: {totalCapacity} pieces. Quantity = moulds used x (pieces per mould - empty slots per mould).
        </div>
      ) : null}

      {message ? <div className="rounded-md border border-line bg-field p-4 font-semibold text-ink">{message}</div> : null}
      <Button tone="primary" className="w-full text-lg" disabled={mutation.isPending || !form.companyId || !form.skuId} onClick={submit}>
        <span className="inline-flex items-center gap-2"><Save size={22} /> Save Production Entry</span>
      </Button>
    </div>
  );
}

function fieldErrors(issues: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value[0] ?? "Check this field"]));
}

function Chooser({
  title,
  items,
  selectedId,
  onSelect
}: {
  title: string;
  items: Company[];
  selectedId: string;
  onSelect: (item: Company) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">{title}</span>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((item) => (
          <Button key={item.id} active={selectedId === item.id} onClick={() => onSelect(item)}>{item.name}</Button>
        ))}
      </div>
    </div>
  );
}
