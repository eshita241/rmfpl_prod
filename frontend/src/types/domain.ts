export type Role = "PENDING" | "ADMIN" | "USER" | "DISPATCH";
export type Permission = "PRODUCTION" | "DISPATCH" | "REPORTS" | "LOGS" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isSuperAdmin?: boolean;
  roleName?: string;
  roleDefinitionId?: string | null;
  permissions?: Permission[];
  createdAt?: string;
  deletedAt?: string | null;
};

export type RoleDefinition = {
  id: string;
  name: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};

export type PermissionOption = {
  id: Permission;
  label: string;
};

export type Company = {
  id: string;
  name: string;
};

export type Sku = {
  id: string;
  name: string;
  companyId: string;
  category: "BREAD" | "BUN" | "OTHER";
  weight: number;
  mouldCapacity: number;
  createdAt?: string;
  deletedAt?: string | null;
  company?: Company;
};

export type ProductionEntry = {
  id: string;
  date: string;
  batchNumber: number;
  companyId: string;
  skuId: string;
  quantityProduced: number;
  mouldsUsed: number;
  emptySlotsPerMould: number;
  notes?: string | null;
  damages: number;
  damageReason?: string;
  company: Company;
  sku: Sku;
  creator?: User;
  damageEntries?: DamageEntry[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type DamageEntry = {
  id: string;
  date: string;
  batch?: string;
  productionEntryId?: string;
  companyId: string;
  skuId: string;
  amount: number;
  reason: string;
  company: Company;
  sku: Sku;
  productionEntry?: ProductionEntry;
  creator?: User;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type DispatchEntry = {
  id: string;
  date: string;
  companyId: string;
  skuId: string;
  quantity: number;
  carNumber: string;
  sealNumber?: string | null;
  cratesSent: number;
  cratesReceived: number;
  company: Company;
  sku: Sku;
  creator?: User;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ProductionTotal = {
  date: string;
  companyId: string;
  skuId: string;
  quantityProduced: number;
  quantityDispatched: number;
  quantityRemaining: number;
  company?: Company;
  sku?: Sku;
};

export type Log = {
  id: string;
  actionType: "CREATE" | "UPDATE" | "DELETE";
  entity: "SKU" | "ENTRY" | "DAMAGE" | "DISPATCH" | "USER_ROLE";
  entityId: string;
  changes: {
    previousValues: unknown;
    newValues: unknown;
  };
  performedBy: string;
  timestamp: string;
  performer: User;
};
