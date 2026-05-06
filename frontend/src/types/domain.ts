export type Role = "ADMIN" | "USER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type Company = {
  id: string;
  name: string;
};

export type Sku = {
  id: string;
  name: string;
  companyId: string;
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

export type Log = {
  id: string;
  actionType: "CREATE" | "UPDATE" | "DELETE";
  entity: "SKU" | "ENTRY" | "DAMAGE" | "USER_ROLE";
  entityId: string;
  changes: {
    previousValues: unknown;
    newValues: unknown;
  };
  performedBy: string;
  timestamp: string;
  performer: User;
};
