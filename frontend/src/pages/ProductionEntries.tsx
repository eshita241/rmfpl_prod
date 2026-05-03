import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompanies, getEntries, getSkus } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { formatIst } from "../utils/time";

const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const shifts = ["", "Morning", "Evening", "Night"];

export function ProductionEntries() {
  const [filters, setFilters] = useState({ date: today, companyId: "", skuId: "", shift: "" });
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", filters.companyId], queryFn: () => getSkus(filters.companyId || undefined) });
  const entries = useQuery({
    queryKey: ["entries", filters],
    queryFn: () => getEntries(filters.date, filters.date, { companyId: filters.companyId, skuId: filters.skuId, shift: filters.shift })
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Production Entries</h2>
        <p className="text-ink/65">Filter by date, bread variant, company, and shift.</p>
      </div>

      <section className="rounded-md border border-line bg-field p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Date" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          <div>
            <span className="mb-2 block text-sm font-semibold text-ink">Shift</span>
            <div className="grid grid-cols-2 gap-2">
              {shifts.map((shift) => (
                <Button key={shift || "all"} active={filters.shift === shift} onClick={() => setFilters({ ...filters, shift })}>
                  {shift || "All"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Button active={!filters.companyId} onClick={() => setFilters({ ...filters, companyId: "", skuId: "" })}>All Companies</Button>
          {(companies.data ?? []).map((company) => (
            <Button key={company.id} active={filters.companyId === company.id} onClick={() => setFilters({ ...filters, companyId: company.id, skuId: "" })}>{company.name}</Button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Button active={!filters.skuId} onClick={() => setFilters({ ...filters, skuId: "" })}>All Variants</Button>
          {(skus.data ?? []).map((sku) => (
            <Button key={sku.id} active={filters.skuId === sku.id} onClick={() => setFilters({ ...filters, skuId: sku.id })}>{sku.name}</Button>
          ))}
        </div>
      </section>

      <div className="overflow-x-auto rounded-md border border-line bg-field">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-milk text-sm uppercase text-ink/70">
            <tr><th className="p-3">Date</th><th>Created IST</th><th>Company</th><th>Variant</th><th>Batch</th><th>Shift</th><th>Moulds</th><th>Empty Slots</th><th>Quantity</th></tr>
          </thead>
          <tbody>
            {(entries.data ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-line">
                <td className="p-3">{entry.date.slice(0, 10)}</td>
                <td>{formatIst(entry.createdAt)}</td>
                <td>{entry.company.name}</td>
                <td>{entry.sku.name}</td>
                <td>Batch {entry.batchNumber}</td>
                <td>{entry.shift}</td>
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
