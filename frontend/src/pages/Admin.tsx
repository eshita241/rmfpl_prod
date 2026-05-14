import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createRoleDefinition, createSku, deleteSku, deleteUser, getCompanies, getPermissions, getRoleDefinitions, getSkus, getUsers, updateSku, updateUserRole } from "../api/queries";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { SelectField } from "../components/SelectField";
import type { Permission, Role, User } from "../types/domain";

const skuCategoryOptions = [
  { label: "Bread", value: "BREAD" },
  { label: "Bun", value: "BUN" },
  { label: "Other", value: "OTHER" }
];

export function Admin() {
  const queryClient = useQueryClient();
  const companies = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const skus = useQuery({ queryKey: ["skus", "admin"], queryFn: () => getSkus(undefined, true) });
  const users = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const roles = useQuery({ queryKey: ["roles"], queryFn: getRoleDefinitions });
  const permissionOptions = useQuery({ queryKey: ["permissions"], queryFn: getPermissions });
  const me = queryClient.getQueryData<{ user: User }>(["me"]);
  const [skuForm, setSkuForm] = useState({ name: "", companyId: "", category: "OTHER", weight: "", mouldCapacity: "" });
  const [roleForm, setRoleForm] = useState<{ name: string; permissions: Permission[] }>({ name: "", permissions: [] });
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [showSkuForm, setShowSkuForm] = useState(false);
  const [skuToDelete, setSkuToDelete] = useState<{ id: string; name: string; company?: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  function resetSkuForm() {
    setSkuForm({ name: "", companyId: "", category: "OTHER", weight: "", mouldCapacity: "" });
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
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      value.startsWith("custom:")
        ? updateUserRole(id, { roleDefinitionId: value.replace("custom:", "") })
        : updateUserRole(id, { role: value as Exclude<Role, "PENDING">, roleDefinitionId: null }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      const currentUser = queryClient.getQueryData<{ user: typeof updatedUser }>(["me"]);
      if (currentUser?.user.id === updatedUser.id) {
        queryClient.setQueryData(["me"], { user: updatedUser });
      } else {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    }
  });

  const userDeleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: createRoleDefinition,
    onSuccess: () => {
      setRoleForm({ name: "", permissions: [] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
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
              setSkuForm({ name: "", companyId: "", category: "OTHER", weight: "", mouldCapacity: "" });
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
            <div className="mt-4 grid gap-4 md:grid-cols-5">
              <Field label="SKU Name" value={skuForm.name} onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
              <SelectField
                label="Category"
                value={skuForm.category}
                onChange={(e) => setSkuForm({ ...skuForm, category: e.target.value })}
                options={skuCategoryOptions}
              />
              <Field label="Weight" type="number" value={skuForm.weight} onChange={(e) => setSkuForm({ ...skuForm, weight: e.target.value })} />
              <Field label="Mould Capacity" type="number" value={skuForm.mouldCapacity} onChange={(e) => setSkuForm({ ...skuForm, mouldCapacity: e.target.value })} />
              <SelectField
                label="Company"
                value={skuForm.companyId}
                onChange={(e) => setSkuForm({ ...skuForm, companyId: e.target.value })}
                options={[
                  { label: "Select company", value: "" },
                  ...(companies.data ?? []).map((company) => ({ label: company.name, value: company.id }))
                ]}
              />
              <Button className="w-full self-end md:w-auto" tone="primary" disabled={!skuForm.name || !skuForm.companyId || !skuForm.category || !skuForm.weight || !skuForm.mouldCapacity} onClick={() => skuMutation.mutate(skuForm)}>
                Add SKU
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(skus.data ?? []).map((sku) => (
            <div key={sku.id} className={`flex flex-col gap-3 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between ${sku.deletedAt ? "bg-slate-100 opacity-70" : "bg-milk"}`}>
              <span className="min-w-0">
                <strong>{sku.name}</strong>
                {sku.deletedAt ? <span className="ml-2 rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">Archived</span> : null}
                <br />
                <small>{sku.company?.name} | {categoryLabel(sku.category)} | {sku.weight}g | {sku.mouldCapacity}</small>
              </span>
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  disabled={Boolean(sku.deletedAt)}
                  onClick={() => {
                    setEditingSkuId(sku.id);
                    setShowSkuForm(false);
                    setSkuForm({
                      name: sku.name,
                      companyId: sku.companyId,
                      category: sku.category,
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
        <Modal
          title="Edit SKU"
          description="Review and update SKU details."
          maxWidth="md"
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={resetSkuForm}>Cancel</Button>
              <Button tone="primary" disabled={!skuForm.name || !skuForm.companyId || !skuForm.category || !skuForm.weight || !skuForm.mouldCapacity || skuMutation.isPending} onClick={() => skuMutation.mutate(skuForm)}>
                Save SKU
              </Button>
            </div>
          }
        >
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="SKU Name" value={skuForm.name} onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })} />
              <SelectField
                label="Category"
                value={skuForm.category}
                onChange={(e) => setSkuForm({ ...skuForm, category: e.target.value })}
                options={skuCategoryOptions}
              />
              <Field label="Weight" type="number" value={skuForm.weight} onChange={(e) => setSkuForm({ ...skuForm, weight: e.target.value })} />
              <Field label="Mould Capacity" type="number" value={skuForm.mouldCapacity} onChange={(e) => setSkuForm({ ...skuForm, mouldCapacity: e.target.value })} />
              <SelectField
                label="Company"
                value={skuForm.companyId}
                onChange={(e) => setSkuForm({ ...skuForm, companyId: e.target.value })}
                options={[
                  { label: "Select company", value: "" },
                  ...(companies.data ?? []).map((company) => ({ label: company.name, value: company.id }))
                ]}
              />
            </div>
        </Modal>
      ) : null}

      <section className="rounded-md border border-line bg-field p-4">
        <h3 className="text-lg font-bold text-ink">Users</h3>
        <div className="mt-3 space-y-3">
          {(users.data ?? []).map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <strong>{user.name}</strong><br />
                <small className="break-all">{user.email}</small>
                {user.isSuperAdmin ? <span className="ml-2 rounded-md bg-brand px-2 py-1 text-xs font-bold text-ink">Super Admin</span> : null}
                {user.role === "PENDING" ? <span className="ml-2 rounded-md bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">Pending approval</span> : null}
                <span className="mt-1 block text-xs font-semibold text-ink/60">{(user.permissions ?? []).join(", ")}</span>
              </span>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                <SelectField
                  label="Role"
                  value={user.roleDefinitionId ? `custom:${user.roleDefinitionId}` : user.role}
                  disabled={user.isSuperAdmin}
                  onChange={(e) => roleMutation.mutate({ id: user.id, value: e.target.value })}
                  options={[
                    ...(user.role === "PENDING" ? [{ label: "Pending approval", value: "PENDING" }] : []),
                    { label: "USER", value: "USER" },
                    { label: "DISPATCH", value: "DISPATCH" },
                    { label: "ADMIN", value: "ADMIN" },
                    ...(roles.data ?? []).map((role) => ({ label: role.name, value: `custom:${role.id}` }))
                  ]}
                  className="w-full sm:w-56"
                />
                <Button tone="danger" disabled={user.id === me?.user.id || user.isSuperAdmin} onClick={() => setUserToDelete(user)}>
                  <span className="inline-flex items-center gap-2"><Trash2 size={18} /> Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-field p-4">
        <h3 className="text-lg font-bold text-ink">Custom Roles</h3>
        <div className="mt-4 rounded-md border border-line bg-paper p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <Field label="Role Name" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
            <Button className="self-end" tone="primary" disabled={!roleForm.name || roleForm.permissions.length === 0 || createRoleMutation.isPending} onClick={() => createRoleMutation.mutate(roleForm)}>
              <span className="inline-flex items-center gap-2"><Plus size={18} /> Add Role</span>
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(permissionOptions.data ?? []).map((permission) => (
              <label key={permission.id} className="flex items-center gap-3 rounded-md border border-line bg-milk p-3 font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={roleForm.permissions.includes(permission.id)}
                  onChange={(e) => {
                    const permissions = e.target.checked
                      ? [...roleForm.permissions, permission.id]
                      : roleForm.permissions.filter((item) => item !== permission.id);
                    setRoleForm({ ...roleForm, permissions });
                  }}
                />
                {permission.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(roles.data ?? []).map((role) => (
            <div key={role.id} className="rounded-md border border-line bg-milk p-3">
              <strong>{role.name}</strong>
              <div className="mt-1 text-sm font-semibold text-ink/60">{role.permissions.join(", ")}</div>
            </div>
          ))}
        </div>
      </section>

      {skuToDelete ? (
        <Modal
          title="Archive SKU?"
          description={
            <>
              This will archive <strong>{skuToDelete.name}</strong>{skuToDelete.company ? ` from ${skuToDelete.company}` : ""}. It will be hidden from new entries, but old production history and reports will stay safe.
            </>
          }
          icon={<Archive className="text-red-700" size={30} />}
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setSkuToDelete(null)}>Cancel</Button>
              <Button tone="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(skuToDelete.id)}>
                Yes, Archive
              </Button>
            </div>
          }
        />
      ) : null}

      {userToDelete ? (
        <Modal
          title="Delete user?"
          description={
            <>
              This will remove <strong>{userToDelete.name}</strong> from active access. Their old production, dispatch, damage, and log history will remain in reports.
            </>
          }
          icon={<Trash2 className="text-red-700" size={30} />}
          actions={
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setUserToDelete(null)}>Cancel</Button>
              <Button tone="danger" disabled={userDeleteMutation.isPending} onClick={() => userDeleteMutation.mutate(userToDelete.id)}>
                Yes, Delete
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}

function categoryLabel(category: string) {
  if (category === "BREAD") return "Bread";
  if (category === "BUN") return "Bun";
  return "Other";
}
