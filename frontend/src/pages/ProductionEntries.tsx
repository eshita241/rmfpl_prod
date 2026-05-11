import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompanies, getEntries, getSkus } from "../api/queries";
import { Field } from "../components/Field";
import { SelectField } from "../components/SelectField";
import { localDateInputValue } from "../utils/date";
import { formatIst } from "../utils/time";

const today = localDateInputValue();

export function ProductionEntries() {
  const [filters, setFilters] = useState({ date: today, companyId: "", skuId: "" });
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", filters.companyId], queryFn: () => getSkus(filters.companyId || undefined) });
  const entries = useQuery({
    queryKey: ["entries", filters],
    queryFn: () => getEntries(filters.date, filters.date, { companyId: filters.companyId, skuId: filters.skuId })
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Production Entries</h2>
        <p className="text-ink/65">Filter by date, bread variant, and company.</p>
      </div>

      <section className="rounded-md border border-line bg-field p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Date" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          <SelectField
            label="Company"
            value={filters.companyId}
            onChange={(e) => setFilters({ ...filters, companyId: e.target.value, skuId: "" })}
            options={[
              { label: "All companies", value: "" },
              ...(companies.data ?? []).map((company) => ({ label: company.name, value: company.id }))
            ]}
          />
          <SelectField
            label="SKU / Bread Variant"
            value={filters.skuId}
            onChange={(e) => setFilters({ ...filters, skuId: e.target.value })}
            options={[
              { label: "All variants", value: "" },
              ...(skus.data ?? []).map((sku) => ({ label: sku.name, value: sku.id }))
            ]}
          />
        </div>
      </section>

      <div className="overflow-x-auto rounded-md border border-line bg-field">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-milk text-sm uppercase text-ink/70">
            <tr><th className="p-3">Date</th><th>Created IST</th><th>Company</th><th>Variant</th><th>Batch</th><th>Moulds</th><th>Extra Slots</th><th>Quantity</th></tr>
          </thead>
          <tbody>
            {(entries.data ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-line">
                <td className="p-3">{entry.date.slice(0, 10)}</td>
                <td>{formatIst(entry.createdAt)}</td>
                <td>{entry.company.name}</td>
                <td>{entry.sku.name}</td>
                <td>Batch {entry.batchNumber}</td>
                <td>{entry.mouldsUsed}</td>
                <td>{entry.emptySlotsPerMould}</td>
                <td>{entry.quantityProduced} pieces</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
