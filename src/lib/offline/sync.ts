import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { executeExpenseMutation, executeSaleMutation } from "@/lib/domain/mutations";
import { markMutationFailed, readPendingMutations, removeMutation } from "@/lib/offline/db";

export async function processOfflineQueue(client: SupabaseClient<Database>) {
  const queue = await readPendingMutations();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.type === "create_sale") {
        await executeSaleMutation(client, item.payload);
      } else {
        await executeExpenseMutation(client, item.payload);
      }

      await removeMutation(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markMutationFailed(
        item.id,
        error instanceof Error ? error.message : "Error de sincronización.",
      );
    }
  }

  return {
    total: queue.length,
    synced,
    failed,
  };
}
