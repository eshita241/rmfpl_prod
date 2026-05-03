import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { createSku, deleteSku, getCompanies, getSkus, getUsers, updateSku, updateUserRole } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export function Admin() {
  const queryClient = useQueryClient();
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", "admin"], queryFn: () => getSkus(undefined, true) });
  const users = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const [skuForm, setSkuForm] = useState({ name: "", companyId: "", weight: "", mouldCapacity: "" });
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [showSkuForm, setShowSkuForm] = useState(false);
  const [skuToDelete, setSkuToDelete] = useState<{ id: string; name: string; company?: string } | null>(null);

  function resetSkuForm() {
    setSkuForm({ name: "", companyId: "", weight: "", mouldCapacity: "" });
    setEditingSkuId(null);
    setShowSkuForm(false);
  }

  const skuMutation = useMutation({
    mutationFn: (body: typeof skuForm) => {
      const payload = {
        ...body,
        weight: Number(body.weight),
        mouldCapacity: Number(body.mouldCapacity)
      };
      return editingSkuId ? updateSku(editingSkuId, payload) : createSku(payload);
    },
    onSuccess: () => {
      resetSkuForm();
      queryClient.invalidateQueries({ queryKey: ["skus"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSku,
    onSuccess: () => {
      setSkuToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["skus"] });
    }
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "USER" }) => updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-ink">Admin</h2>

      <section className="rounded-md border border-line bg-field p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-ink">SKUs</h3>
          <Button
            tone="primary"
            onClick={() => {
              setSkuForm({ name: "", companyId: "", weight: "", mouldCapacity: "" });
              setEditingSkuId(null);
              setShowSkuForm(true);
            }}
          >
            <span className="inline-flex items-center gap-2"><Plus size={18} /> Add SKU</span>
          </Button>
        </div>

        {showSkuForm ? (
          <div className="mt-4 rounded-md border border-line bg-paper p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-base font-bold text-ink">Add SKU</h4>
              <Button onClick={resetSkuForm}>
                <span className="inline-flex items-center gap-2"><X size={18} /> Close</span>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Field label="SKU Name" value={skuForm.name} onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
              <Field label="Weight" type="number" value={skuForm.weight} onChange={(e) => setSkuForm({ ...skuForm, weight: e.target.value })} />
              <Field label="Mould Capacity" type="number" value={skuForm.mouldCapacity} onChange={(e) => setSkuForm({ ...skuForm, mouldCapacity: e.target.value })} />
              <Button className="self-end" tone="primary" disabled={!skuForm.name || !skuForm.companyId || !skuForm.weight || !skuForm.mouldCapacity} onClick={() => skuMutation.mutate(skuForm)}>
                Add SKU
              </Button>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {(companies.data ?? []).map((company) => (
                <Button key={company.id} active={skuForm.companyId === company.id} onClick={() => setSkuForm({ ...skuForm, companyId: company.id })}>{company.name}</Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(skus.data ?? []).map((sku) => (
            <div key={sku.id} className={`flex items-center justify-between gap-3 rounded-md border border-line p-3 ${sku.deletedAt ? "bg-slate-100 opacity-70" : "bg-milk"}`}>
              <span>
                <strong>{sku.name}</strong>
                {sku.deletedAt ? <span className="ml-2 rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">Archived</span> : null}
                <br />
                <small>{sku.company?.name} | {sku.weight}g | {sku.mouldCapacity}</small>
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={Boolean(sku.deletedAt)}
                  onClick={() => {
                    setEditingSkuId(sku.id);
                    setShowSkuForm(false);
                    setSkuForm({
                      name: sku.name,
                      companyId: sku.companyId,
                      weight: String(sku.weight),
                      mouldCapacity: String(sku.mouldCapacity)
                    });
                  }}
                >
                  <Pencil size={18} />
                </Button>
                <Button tone="danger" disabled={Boolean(sku.deletedAt)} onClick={() => setSkuToDelete({ id: sku.id, name: sku.name, company: sku.company?.name })}><Archive size={18} /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingSkuId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <section className="w-full max-w-2xl rounded-md border border-line bg-field p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-ink">Edit SKU</h3>
                <p className="text-sm text-ink/60">Review and update SKU details.</p>
              </div>
              <Button onClick={resetSkuForm}>
                <span className="inline-flex items-center gap-2"><X size={18} /> Close</span>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="SKU Name" value={skuForm.name} onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
              <Field label="Weight" type="number" value={skuForm.weight} onChange={(e) => setSkuForm({ ...skuForm, weight: e.target.value })} />
              <Field label="Mould Capacity" type="number" value={skuForm.mouldCapacity} onChange={(e) => setSkuForm({ ...skuForm, mouldCapacity: e.target.value })} />
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {(companies.data ?? []).map((company) => (
                <Button key={company.id} active={skuForm.companyId === company.id} onClick={() => setSkuForm({ ...skuForm, companyId: company.id })}>{company.name}</Button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={resetSkuForm}>Cancel</Button>
              <Button tone="primary" disabled={!skuForm.name || !skuForm.companyId || !skuForm.weight || !skuForm.mouldCapacity || skuMutation.isPending} onClick={() => skuMutation.mutate(skuForm)}>
                Save SKU
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="rounded-md border border-line bg-field p-4">
        <h3 className="text-lg font-bold text-ink">Users</h3>
        <div className="mt-3 space-y-3">
          {(users.data ?? []).map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
              <span><strong>{user.name}</strong><br /><small>{user.email}</small></span>
              <div className="grid grid-cols-2 gap-2">
                <Button active={user.role === "USER"} onClick={() => roleMutation.mutate({ id: user.id, role: "USER" })}>USER</Button>
                <Button active={user.role === "ADMIN"} onClick={() => roleMutation.mutate({ id: user.id, role: "ADMIN" })}>ADMIN</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {skuToDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <section className="w-full max-w-md rounded-md border border-line bg-field p-5 shadow-xl">
            <h3 className="text-xl font-bold text-ink">Archive SKU?</h3>
            <p className="mt-3 text-ink/75">
              This will archive <strong>{skuToDelete.name}</strong>{skuToDelete.company ? ` from ${skuToDelete.company}` : ""}. It will be hidden from new entries, but old production history and reports will stay safe.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={() => setSkuToDelete(null)}>Cancel</Button>
              <Button tone="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(skuToDelete.id)}>
                Yes, Archive
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
