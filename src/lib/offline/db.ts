import Dexie, { type Table } from "dexie";
import type {
  CashSessionSummary,
  OfflineMutation,
  Product,
} from "@/lib/domain/types";

type SessionCacheRecord = {
  key: "open-session";
  value: CashSessionSummary | null;
  updatedAt: string;
};

class NutriaOfflineDB extends Dexie {
  products!: Table<Product, string>;
  meta!: Table<SessionCacheRecord, string>;
  queue!: Table<OfflineMutation, string>;

  constructor() {
    super("nutria-systems");
    this.version(1).stores({
      products: "id, displayOrder, active, updatedAt",
      meta: "key, updatedAt",
      queue: "id, createdAt, syncStatus, type",
    });
  }
}

export const offlineDb = new NutriaOfflineDB();

export async function cacheProducts(products: Product[]) {
  await offlineDb.transaction("rw", offlineDb.products, async () => {
    await offlineDb.products.clear();
    if (products.length > 0) {
      await offlineDb.products.bulkPut(products);
    }
  });
}

export async function readCachedProducts() {
  return offlineDb.products.orderBy("displayOrder").toArray();
}

export async function cacheOpenSession(session: CashSessionSummary | null) {
  await offlineDb.meta.put({
    key: "open-session",
    value: session,
    updatedAt: new Date().toISOString(),
  });
}

export async function readCachedOpenSession() {
  const record = await offlineDb.meta.get("open-session");
  return record?.value ?? null;
}

export async function enqueueMutation(item: OfflineMutation) {
  await offlineDb.queue.put(item);
}

export async function readPendingMutations() {
  return offlineDb.queue
    .orderBy("createdAt")
    .filter((item) => item.syncStatus !== "synced")
    .toArray();
}

export async function removeMutation(id: string) {
  await offlineDb.queue.delete(id);
}

export async function markMutationFailed(id: string, message: string) {
  await offlineDb.queue.update(id, {
    syncStatus: "failed",
    lastError: message,
  });
}

export async function getPendingMutationCount() {
  return offlineDb.queue
    .filter((item) => item.syncStatus !== "synced")
    .count();
}
