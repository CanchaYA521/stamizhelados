"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import type {
  AppUser,
  CashSessionSummary,
  CreateExpenseInput,
  CreateSaleInput,
  OfflineMutation,
  Product,
  ProductInput,
  VoidSaleInput,
} from "@/lib/domain/types";
import {
  closeCashSession,
  executeExpenseMutation,
  executeSaleMutation,
  openCashSession,
  upsertProduct,
  voidSale,
} from "@/lib/domain/mutations";
import { fetchOpenSessionSummary, fetchProducts } from "@/lib/domain/queries";
import {
  cacheOpenSession,
  cacheProducts,
  enqueueMutation,
  getPendingMutationCount,
  readCachedOpenSession,
  readCachedProducts,
} from "@/lib/offline/db";
import { processOfflineQueue } from "@/lib/offline/sync";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv, MISSING_SUPABASE_MESSAGE } from "@/lib/supabase/env";

type AppDataContextValue = {
  user: AppUser | null;
  supabase: SupabaseClient<Database> | null;
  hasSupabaseConfig: boolean;
  isOnline: boolean;
  isBootstrapping: boolean;
  isRefreshing: boolean;
  products: Product[];
  openSession: CashSessionSummary | null;
  pendingCount: number;
  dataVersion: number;
  refreshCoreData: () => Promise<void>;
  openSessionAction: (openingAmount: number) => Promise<void>;
  closeSessionAction: (countedCash: number) => Promise<void>;
  upsertProductAction: (input: ProductInput) => Promise<void>;
  createSaleAction: (input: CreateSaleInput) => Promise<{ queued: boolean }>;
  createExpenseAction: (
    input: CreateExpenseInput,
  ) => Promise<{ queued: boolean }>;
  voidSaleAction: (input: VoidSaleInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

async function loadCachedState() {
  const [products, openSession, pendingCount] = await Promise.all([
    readCachedProducts(),
    readCachedOpenSession(),
    getPendingMutationCount(),
  ]);

  return {
    products,
    openSession,
    pendingCount,
  };
}

function createOfflineMutation(input: OfflineMutation) {
  return input;
}

export function AppDataProvider({
  children,
  initialUser,
}: Readonly<{
  children: React.ReactNode;
  initialUser: AppUser | null;
}>) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [isOnline, setIsOnline] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [openSessionState, setOpenSessionState] =
    useState<CashSessionSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const hasSupabaseConfig = hasSupabaseEnv();

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user
        ? {
            id: session.user.id,
            email: session.user.email ?? null,
          }
        : null;

      setUser(nextUser);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getPendingMutationCount());
  }, []);

  const applyCachedState = useCallback(async () => {
    const cached = await loadCachedState();
    startTransition(() => {
      setProducts(cached.products);
      setOpenSessionState(cached.openSession);
      setPendingCount(cached.pendingCount);
    });
  }, []);

  const refreshCoreData = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase || !user) {
      await applyCachedState();
      setIsBootstrapping(false);
      return;
    }

    setIsRefreshing(true);

    try {
      if (!navigator.onLine) {
        await applyCachedState();
        return;
      }

      const [freshProducts, freshSession] = await Promise.all([
        fetchProducts(supabase),
        fetchOpenSessionSummary(supabase),
      ]);

      await Promise.all([
        cacheProducts(freshProducts),
        cacheOpenSession(freshSession),
        refreshPendingCount(),
      ]);

      startTransition(() => {
        setProducts(freshProducts);
        setOpenSessionState(freshSession);
        setDataVersion((current) => current + 1);
      });
    } catch {
      await applyCachedState();
    } finally {
      setIsRefreshing(false);
      setIsBootstrapping(false);
    }
  }, [applyCachedState, hasSupabaseConfig, refreshPendingCount, supabase, user]);

  const syncQueue = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase || !user || !navigator.onLine) {
      return;
    }

    const result = await processOfflineQueue(supabase);

    if (result.synced > 0) {
      toast.success(
        `${result.synced} movimiento${result.synced === 1 ? "" : "s"} sincronizado${result.synced === 1 ? "" : "s"}.`,
      );
    }

    if (result.failed > 0) {
      toast.error(
        `${result.failed} elemento${result.failed === 1 ? "" : "s"} sigue pendiente por revisar.`,
      );
    }

    await refreshCoreData();
  }, [hasSupabaseConfig, refreshCoreData, supabase, user]);

  useEffect(() => {
    void applyCachedState().finally(() => {
      if (!hasSupabaseConfig) {
        setIsBootstrapping(false);
        return;
      }

      if (user) {
        void refreshCoreData();
      } else {
        setIsBootstrapping(false);
      }
    });
  }, [applyCachedState, hasSupabaseConfig, refreshCoreData, user]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    void syncQueue();
  }, [isOnline, syncQueue]);

  const getConfiguredSupabase = (): SupabaseClient<Database> => {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error(MISSING_SUPABASE_MESSAGE);
    }

    return supabase;
  };

  const openSessionAction = async (openingAmount: number) => {
    const client = getConfiguredSupabase();
    await openCashSession(client, openingAmount);
    toast.success("Caja abierta correctamente.");
    await refreshCoreData();
  };

  const closeSessionAction = async (countedCash: number) => {
    const client = getConfiguredSupabase();

    if (!openSessionState) {
      throw new Error("No hay una caja abierta para cerrar.");
    }

    await closeCashSession(client, {
      sessionId: openSessionState.id,
      countedCash,
    });
    toast.success("Caja cerrada correctamente.");
    await refreshCoreData();
  };

  const upsertProductAction = async (input: ProductInput) => {
    const client = getConfiguredSupabase();
    await upsertProduct(client, input);
    toast.success(input.id ? "Producto actualizado." : "Producto creado.");
    await refreshCoreData();
  };

  const createSaleAction = async (input: CreateSaleInput) => {
    const client = getConfiguredSupabase();

    if (!openSessionState) {
      throw new Error("Abre una caja antes de registrar ventas.");
    }

    const payload = {
      saleId: crypto.randomUUID(),
      sessionId: openSessionState.id,
      paymentMethod: input.paymentMethod,
      items: input.items,
      createdAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await enqueueMutation(
        createOfflineMutation({
          id: payload.saleId,
          type: "create_sale",
          payload,
          createdAt: payload.createdAt,
          syncStatus: "pending",
          lastError: null,
        }),
      );
      await refreshPendingCount();
      setDataVersion((current) => current + 1);
      toast.success("Venta guardada offline. Se sincronizará al reconectar.");
      return { queued: true };
    }

    await executeSaleMutation(client, payload);
    toast.success("Venta registrada.");
    await refreshCoreData();
    return { queued: false };
  };

  const createExpenseAction = async (input: CreateExpenseInput) => {
    const client = getConfiguredSupabase();

    if (!openSessionState) {
      throw new Error("Abre una caja antes de registrar egresos.");
    }

    const payload = {
      expenseId: crypto.randomUUID(),
      sessionId: openSessionState.id,
      amount: input.amount,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await enqueueMutation(
        createOfflineMutation({
          id: payload.expenseId,
          type: "create_expense",
          payload,
          createdAt: payload.createdAt,
          syncStatus: "pending",
          lastError: null,
        }),
      );
      await refreshPendingCount();
      setDataVersion((current) => current + 1);
      toast.success("Egreso guardado offline. Quedó pendiente de sincronizar.");
      return { queued: true };
    }

    await executeExpenseMutation(client, payload);
    toast.success("Egreso registrado.");
    await refreshCoreData();
    return { queued: false };
  };

  const voidSaleAction = async (input: VoidSaleInput) => {
    const client = getConfiguredSupabase();
    await voidSale(client, input);
    toast.success("Venta anulada.");
    await refreshCoreData();
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  const contextValue: AppDataContextValue = {
    user,
    supabase,
    hasSupabaseConfig,
    isOnline,
    isBootstrapping,
    isRefreshing,
    products,
    openSession: openSessionState,
    pendingCount,
    dataVersion,
    refreshCoreData,
    openSessionAction,
    closeSessionAction,
    upsertProductAction,
    createSaleAction,
    createExpenseAction,
    voidSaleAction,
    signOut,
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData debe usarse dentro de AppDataProvider.");
  }

  return context;
}
