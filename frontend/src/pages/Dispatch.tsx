import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, ClipboardCheck, PackageCheck, Save, Truck } from "lucide-react";
import { createDispatch, getCompanies, getDispatchProductionTotals, getDispatches, getSkus } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { SelectField } from "../components/SelectField";
import { localDateInputValue } from "../utils/date";
import { formatIst } from "../utils/time";

const today = localDateInputValue();
const vehicleNumberPattern = /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

type DispatchForm = {
  quantity: string;
  carNumber: string;
  sealNumber: string;
  cratesSent: string;
  cratesReceived: string;
};

const initialForm: DispatchForm = {
  quantity: "",
  carNumber: "",
  sealNumber: "",
  cratesSent: "0",
  cratesReceived: "0"
};

export function Dispatch() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date: today, companyId: "", skuId: "" });
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const filterSkus = useQuery({ queryKey: ["skus", filters.companyId], queryFn: () => getSkus(filters.companyId), enabled: Boolean(filters.companyId) });
  const totals = useQuery({
    queryKey: ["dispatch-production-totals", filters],
    queryFn: () => getDispatchProductionTotals(filters.date, filters.date, { companyId: filters.companyId, skuId: filters.skuId }),
    enabled: Boolean(filters.companyId && filters.skuId)
  });
  const dispatches = useQuery({
    queryKey: ["dispatches", filters],
    queryFn: () => getDispatches(filters.date, filters.date, { companyId: filters.companyId, skuId: filters.skuId }),
    enabled: Boolean(filters.companyId && filters.skuId)
  });
  const formTotals = useQuery({
    queryKey: ["dispatch-production-totals", filters.date, filters.companyId, filters.skuId],
    queryFn: () => getDispatchProductionTotals(filters.date, filters.date, { companyId: filters.companyId, skuId: filters.skuId }),
    enabled: Boolean(filters.date && filters.companyId && filters.skuId)
  });
  const selectedCompany = useMemo(() => companies.data?.find((company) => company.id === filters.companyId), [companies.data, filters.companyId]);
  const selectedSku = useMemo(() => filterSkus.data?.find((sku) => sku.id === filters.skuId), [filterSkus.data, filters.skuId]);
  const isModern = selectedCompany?.name.toLowerCase() === "modern";
  const productionState = formTotals.data?.[0];
  const quantityRemaining = productionState?.quantityRemaining ?? 0;
  const normalizedCarNumber = normalizeVehicleNumber(form.carNumber);
  const carNumberIsValid = !form.carNumber || vehicleNumberPattern.test(normalizedCarNumber);
  const quantityRequested = Number(form.quantity || 0);
  const quantityExceedsRemaining = Boolean(form.quantity && quantityRequested > quantityRemaining);
  const selectionReady = Boolean(filters.companyId && filters.skuId);
  const selectedImage = variantImage(selectedSku?.category);

  const mutation = useMutation({
    mutationFn: () =>
      createDispatch({
        ...form,
        date: filters.date,
        companyId: filters.companyId,
        skuId: filters.skuId,
        quantity: Number(form.quantity),
        cratesSent: Number(form.cratesSent || 0),
        cratesReceived: Number(form.cratesReceived || 0)
      }),
    onSuccess: () => {
      setMessage("Dispatch entry saved.");
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-production-totals"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (error: Error) => setMessage(error.message)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Dispatch</h2>
          <p className="text-ink/65">Select a production lot, confirm remaining quantity, then record dispatch.</p>
        </div>
      </div>

      <section className="rounded-md border border-line bg-field p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-ink/60">
          <ClipboardCheck size={18} />
          Production lot
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Date" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          <SelectField
            label="Company"
            value={filters.companyId}
            onChange={(e) => setFilters({ ...filters, companyId: e.target.value, skuId: "" })}
            options={[
              { label: "Select company", value: "" },
              ...(companies.data ?? []).map((company) => ({ label: company.name, value: company.id }))
            ]}
          />
          <SelectField
            label="Variant"
            value={filters.skuId}
            onChange={(e) => setFilters({ ...filters, skuId: e.target.value })}
            disabled={!filters.companyId}
            options={[
              { label: filters.companyId ? "Select variant" : "Select company first", value: "" },
              ...(filterSkus.data ?? []).map((sku) => ({ label: sku.name, value: sku.id }))
            ]}
          />
        </div>
      </section>

      {!selectionReady ? (
        <section className="rounded-md border border-dashed border-line bg-field p-8 text-center shadow-sm">
          <Truck className="mx-auto text-ink/45" size={42} />
          <h3 className="mt-4 text-xl font-bold text-ink">Choose a lot to begin</h3>
          <p className="mx-auto mt-2 max-w-xl text-ink/65">Dispatch quantities are checked against the selected date, company, and variant.</p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-md border border-line bg-field p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(26rem,1.8fr)]">
              <div className="flex min-w-0 gap-4">
                <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-milk sm:h-28 sm:w-28">
                  <img className="h-full w-full object-contain p-3" src={selectedImage} alt={selectedSku?.name ?? "Selected variant"} />
                </div>
                <div className="min-w-0 self-center">
                  <p className="text-sm font-bold uppercase text-ink/55">{filters.date}</p>
                  <h3 className="mt-1 break-words text-xl font-bold text-ink sm:text-2xl">{selectedSku?.name ?? "Selected variant"}</h3>
                  <p className="mt-1 font-semibold text-ink/65">{selectedCompany?.name}</p>
                </div>
              </div>

              {totals.data?.length === 0 ? (
                <div className="rounded-md border border-line bg-milk p-4 font-semibold text-ink">No production found for this lot.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <QuantityTile label="Produced" value={productionState?.quantityProduced ?? 0} />
                  <QuantityTile label="Dispatched" value={productionState?.quantityDispatched ?? 0} />
                  <QuantityTile label="Remaining" value={quantityRemaining} emphasis />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-md border border-line bg-field p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-ink/60">
              <PackageCheck size={18} />
              Dispatch details
            </div>
            <div className={`grid gap-4 ${isModern ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-[1fr_1fr_1fr_auto]"}`}>
              <Field label="Car Number" value={form.carNumber} error={carNumberIsValid ? undefined : "Use a valid number, e.g. MH12AB1234 or 24BH1234AA"} onChange={(e) => setForm({ ...form, carNumber: e.target.value.toUpperCase() })} />
              <Field label="Quantity" type="number" inputMode="numeric" max={quantityRemaining || undefined} error={quantityExceedsRemaining ? `Only ${quantityRemaining} pieces remaining for dispatch.` : undefined} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              {isModern ? <Field label="Seal No." value={form.sealNumber} onChange={(e) => setForm({ ...form, sealNumber: e.target.value })} /> : null}
              {isModern ? <Field label="Crates Sent" type="number" inputMode="numeric" value={form.cratesSent} onChange={(e) => setForm({ ...form, cratesSent: e.target.value })} /> : null}
              {isModern ? <Field label="Crates Received" type="number" inputMode="numeric" value={form.cratesReceived} onChange={(e) => setForm({ ...form, cratesReceived: e.target.value })} /> : null}
              <Button className="h-14 self-end whitespace-nowrap px-6" tone="primary" disabled={mutation.isPending || !form.quantity || !form.carNumber || !carNumberIsValid || quantityExceedsRemaining || quantityRemaining <= 0} onClick={() => mutation.mutate()}>
                <span className="inline-flex items-center gap-2"><Save size={20} /> Save</span>
              </Button>
            </div>
            {isModern ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/60">
                <Boxes size={16} />
                Track crates sent and crates received for this dispatch.
              </div>
            ) : null}
            {message ? <div className="mt-4 rounded-md border border-line bg-milk p-3 font-semibold text-ink">{message}</div> : null}
          </section>

          <section className="rounded-md border border-line bg-field p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-ink/60">
              <Truck size={18} />
              Dispatches for this lot
            </div>
            {dispatches.isError ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-5 text-center font-semibold text-red-800">
                Could not load dispatch records. Refresh after the backend restarts.
              </div>
            ) : (dispatches.data ?? []).length ? (
              <div className="overflow-x-auto rounded-md border border-line bg-milk">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-field text-sm uppercase text-ink/60">
                    <tr>
                      <th className="p-3">Created IST</th>
                      <th>Vehicle</th>
                      <th>Quantity</th>
                      <th>Seal No.</th>
                      {isModern ? <th>Crates Sent</th> : null}
                      {isModern ? <th>Crates Received</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {(dispatches.data ?? []).map((dispatch) => (
                      <tr key={dispatch.id} className="border-t border-line">
                        <td className="p-3">{formatIst(dispatch.createdAt)}</td>
                        <td className="font-bold">{dispatch.carNumber}</td>
                        <td>{dispatch.quantity}</td>
                        <td>{dispatch.sealNumber ?? "-"}</td>
                        {isModern ? <td>{dispatch.cratesSent}</td> : null}
                        {isModern ? <td>{dispatch.cratesReceived}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-line bg-milk p-5 text-center font-semibold text-ink/60">No dispatches recorded yet.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function normalizeVehicleNumber(carNumber: string) {
  return carNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

function QuantityTile({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${emphasis ? "border-brand bg-brand/25" : "border-line bg-milk"}`}>
      <span className="block text-xs font-bold uppercase text-ink/55">{label}</span>
      <strong className="mt-1 block text-2xl text-ink">{value}</strong>
      <span className="text-sm font-semibold text-ink/60">pieces</span>
    </div>
  );
}

function variantImage(category?: string) {
  if (category === "BREAD") return "/icons/bread-icon-512.png";
  if (category === "BUN") return "/icons/bread-icon-192.png";
  return "/logo-rmfpl.png";
}
