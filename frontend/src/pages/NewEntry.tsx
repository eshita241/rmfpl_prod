import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { createEntry, getCompanies, getSkus } from "../api/queries";
import type { Company, Sku } from "../types/domain";
import { ApiError } from "../api/client";

const today = new Date().toISOString().slice(0, 10);
const shifts = ["Morning", "Evening", "Night"];

type FormState = {
  date: string;
  shift: string;
  companyId: string;
  skuId: string;
  quantityProduced: string;
  mouldsUsed: string;
  emptySlotsPerMould: string;
  notes: string;
};

const initialForm: FormState = {
  date: today,
  shift: "Morning",
  companyId: "",
  skuId: "",
  quantityProduced: "",
  mouldsUsed: "",
  emptySlotsPerMould: "0",
  notes: ""
};

export function NewEntry() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => {
    const last = localStorage.getItem("last-entry-form");
    return last ? { ...initialForm, ...JSON.parse(last), date: today } : initialForm;
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", form.companyId], queryFn: () => getSkus(form.companyId), enabled: Boolean(form.companyId) });
  const selectedSku = useMemo(() => skus.data?.find((sku) => sku.id === form.skuId), [skus.data, form.skuId]);
  const totalCapacity = selectedSku ? Number(form.mouldsUsed || 0) * selectedSku.mouldCapacity : 0;
  const exceedsCapacity = selectedSku && Number(form.quantityProduced || 0) > totalCapacity;

  const mutation = useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      localStorage.setItem("last-entry-form", JSON.stringify({ ...form, quantityProduced: "" }));
      setMessage("Entry saved.");
      setErrors({});
      setForm((current) => ({ ...current, quantityProduced: "" }));
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
      quantityProduced: Number(form.quantityProduced),
      mouldsUsed: Number(form.mouldsUsed),
      emptySlotsPerMould: Number(form.emptySlotsPerMould),
      notes: form.notes
    });
  }

  function repeatLastEntry() {
    const last = localStorage.getItem("last-entry-form");
    if (last) setForm({ ...initialForm, ...JSON.parse(last), date: today });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">New Production Entry</h2>
          <p className="text-ink/65">Large controls, defaults, and checks for quick shop-floor entry.</p>
        </div>
        <Button onClick={repeatLastEntry}>
          <span className="inline-flex items-center gap-2"><RotateCcw size={20} /> Repeat Last Entry</span>
        </Button>
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
              <span className="mt-1 block text-sm opacity-80">{sku.weight}g | {sku.mouldCapacity} per mould</span>
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
        <Field label="Quantity Produced" type="number" inputMode="numeric" error={errors.quantityProduced} value={form.quantityProduced} onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} />
      </section>

      {selectedSku ? (
        <div className={`rounded-md border p-4 font-semibold ${exceedsCapacity ? "border-red-300 bg-red-50 text-red-800" : "border-line bg-field text-ink"}`}>
          Total capacity: {totalCapacity}. {exceedsCapacity ? "Production is above capacity. Please check quantity or moulds." : "Capacity looks fine."}
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
