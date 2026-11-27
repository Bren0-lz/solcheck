import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import {
  HistoryResponse,
  ReclaimLogRequest,
  RiskFlag,
  SolanaCluster,
} from "./types";

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("<") &&
      !key.includes("<")
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  if (!isSupabaseConfigured()) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  return cachedClient;
}

// Ephemeral in-process fallback used ONLY when Supabase env vars are not set yet
interface MemoryStore {
  profiles: Map<
    string,
    {
      wallet_address: string;
      preferred_lang: "en" | "pt";
      total_sol_reclaimed: number;
      total_accounts_closed: number;
    }
  >;
  snapshots: Array<{
    id: string;
    wallet_address: string;
    cluster: SolanaCluster;
    sol_balance: number;
    empty_token_accounts: number;
    active_token_accounts: number;
    reclaimable_sol: number;
    health_score: number;
    risk_flags: RiskFlag[];
    ai_summary_en: string | null;
    ai_summary_pt: string | null;
    created_at: string;
  }>;
  events: Array<{
    id: string;
    wallet_address: string;
    tx_signature: string;
    action_type: ReclaimLogRequest["actionType"];
    accounts_closed: number;
    sol_amount: number;
    created_at: string;
  }>;
  researchCache: Map<
    string,
    {
      protocol_slug: string;
      source_url: string;
      extracted_markdown: string;
      structured_insights: Record<string, unknown>;
      fetched_at: string;
      expires_at: string;
    }
  >;
}

const globalForStore = globalThis as unknown as {
  __solcheckMemoryStore?: MemoryStore;
};

export function getMemoryStore(): MemoryStore {
  if (!globalForStore.__solcheckMemoryStore) {
    globalForStore.__solcheckMemoryStore = {
      profiles: new Map(),
      snapshots: [],
      events: [],
      researchCache: new Map(),
    };
  }
  return globalForStore.__solcheckMemoryStore;
}

export async function persistScanSnapshot(params: {
  walletAddress: string;
  cluster: SolanaCluster;
  solBalance: number;
  emptyTokenAccounts: number;
  activeTokenAccounts: number;
  reclaimableSol: number;
  healthScore: number;
  riskFlags: RiskFlag[];
}): Promise<{ snapshotId: string; createdAt: string }> {
  const createdAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      await supabase.from("wallet_profiles").upsert(
        {
          wallet_address: params.walletAddress,
          updated_at: createdAt,
        },
        { onConflict: "wallet_address" }
      );

      const { data, error } = await supabase
        .from("wallet_snapshots")
        .insert({
          wallet_address: params.walletAddress,
          cluster: params.cluster,
          sol_balance: params.solBalance,
          empty_token_accounts: params.emptyTokenAccounts,
          active_token_accounts: params.activeTokenAccounts,
          reclaimable_sol: params.reclaimableSol,
          health_score: params.healthScore,
          risk_flags: params.riskFlags,
        })
        .select("id, created_at")
        .single();

      if (!error && data) {
        return {
          snapshotId: String(data.id),
          createdAt: String(data.created_at),
        };
      }
      console.warn("[Supabase] Snapshot insert warning:", error?.message);
    } catch (err) {
      console.warn("[Supabase] Snapshot persistence fallback:", err);
    }
  }

  const store = getMemoryStore();
  if (!store.profiles.has(params.walletAddress)) {
    store.profiles.set(params.walletAddress, {
      wallet_address: params.walletAddress,
      preferred_lang: "en",
      total_sol_reclaimed: 0,
      total_accounts_closed: 0,
    });
  }
  const snapshotId = crypto.randomUUID();
  store.snapshots.unshift({
    id: snapshotId,
    wallet_address: params.walletAddress,
    cluster: params.cluster,
    sol_balance: params.solBalance,
    empty_token_accounts: params.emptyTokenAccounts,
    active_token_accounts: params.activeTokenAccounts,
    reclaimable_sol: params.reclaimableSol,
    health_score: params.healthScore,
    risk_flags: params.riskFlags,
    ai_summary_en: null,
    ai_summary_pt: null,
    created_at: createdAt,
  });

  return { snapshotId, createdAt };
}

export async function updateSnapshotAiSummary(params: {
  snapshotId?: string;
  walletAddress: string;
  lang: "en" | "pt";
  summary: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const summaryField = params.lang === "pt" ? "ai_summary_pt" : "ai_summary_en";

  if (supabase) {
    try {
      await supabase
        .from("wallet_profiles")
        .upsert(
          {
            wallet_address: params.walletAddress,
            preferred_lang: params.lang,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wallet_address" }
        );

      if (params.snapshotId) {
        await supabase
          .from("wallet_snapshots")
          .update({ [summaryField]: params.summary })
          .eq("id", params.snapshotId);
      }
      return;
    } catch (err) {
      console.warn("[Supabase] Summary update warning:", err);
    }
  }

  const store = getMemoryStore();
  const target = store.snapshots.find(
    (s) =>
      (params.snapshotId && s.id === params.snapshotId) ||
      s.wallet_address === params.walletAddress
  );
  if (target) {
    if (params.lang === "pt") target.ai_summary_pt = params.summary;
    else target.ai_summary_en = params.summary;
  }
}

export async function recordReclaimEvent(
  req: ReclaimLogRequest
): Promise<{ eventId: string; createdAt: string }> {
  const createdAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const isReclaimAction =
    req.actionType === "reclaim" || req.actionType === "reclaim_and_vault";

  if (supabase) {
    try {
      const { data: existingProfile } = await supabase
        .from("wallet_profiles")
        .select("total_sol_reclaimed, total_accounts_closed")
        .eq("wallet_address", req.walletAddress)
        .maybeSingle();

      const nextSolReclaimed =
        Number(existingProfile?.total_sol_reclaimed ?? 0) +
        (isReclaimAction ? req.solAmount : 0);
      const nextAccountsClosed =
        Number(existingProfile?.total_accounts_closed ?? 0) +
        (isReclaimAction ? req.accountsClosed : 0);

      await supabase.from("wallet_profiles").upsert(
        {
          wallet_address: req.walletAddress,
          total_sol_reclaimed: nextSolReclaimed,
          total_accounts_closed: nextAccountsClosed,
          updated_at: createdAt,
        },
        { onConflict: "wallet_address" }
      );

      const { data, error } = await supabase
        .from("reclaim_events")
        .upsert(
          {
            wallet_address: req.walletAddress,
            tx_signature: req.txSignature,
            action_type: req.actionType,
            accounts_closed: req.accountsClosed,
            sol_amount: req.solAmount,
          },
          { onConflict: "tx_signature" }
        )
        .select("id, created_at")
        .single();

      if (!error && data) {
        return {
          eventId: String(data.id),
          createdAt: String(data.created_at),
        };
      }
      console.warn("[Supabase] Reclaim event insert warning:", error?.message);
    } catch (err) {
      console.warn("[Supabase] Reclaim event fallback:", err);
    }
  }

  const store = getMemoryStore();
  const profile = store.profiles.get(req.walletAddress) ?? {
    wallet_address: req.walletAddress,
    preferred_lang: "en" as const,
    total_sol_reclaimed: 0,
    total_accounts_closed: 0,
  };
  const alreadyLogged = store.events.some(
    (e) => e.tx_signature === req.txSignature
  );
  if (!alreadyLogged && isReclaimAction) {
    profile.total_sol_reclaimed += req.solAmount;
    profile.total_accounts_closed += req.accountsClosed;
  }
  store.profiles.set(req.walletAddress, profile);

  const existing = store.events.find((e) => e.tx_signature === req.txSignature);
  if (existing) {
    return { eventId: existing.id, createdAt: existing.created_at };
  }

  const eventId = crypto.randomUUID();
  store.events.unshift({
    id: eventId,
    wallet_address: req.walletAddress,
    tx_signature: req.txSignature,
    action_type: req.actionType,
    accounts_closed: req.accountsClosed,
    sol_amount: req.solAmount,
    created_at: createdAt,
  });

  return { eventId, createdAt };
}

export async function fetchWalletHistory(
  walletAddress: string,
  cluster: SolanaCluster = "devnet"
): Promise<HistoryResponse> {
  const supabase = getSupabaseAdmin();
  const clusterParam = cluster === "mainnet-beta" ? "" : "?cluster=devnet";

  if (supabase) {
    try {
      const [profileRes, snapshotsRes, countRes, eventsRes] = await Promise.all([
        supabase
          .from("wallet_profiles")
          .select("total_sol_reclaimed, total_accounts_closed")
          .eq("wallet_address", walletAddress)
          .maybeSingle(),
        supabase
          .from("wallet_snapshots")
          .select(
            "id, health_score, sol_balance, empty_token_accounts, reclaimable_sol, created_at"
          )
          .eq("wallet_address", walletAddress)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("wallet_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("wallet_address", walletAddress),
        supabase
          .from("reclaim_events")
          .select(
            "id, tx_signature, action_type, accounts_closed, sol_amount, created_at"
          )
          .eq("wallet_address", walletAddress)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (!snapshotsRes.error && !eventsRes.error) {
        return {
          walletAddress,
          totalSolReclaimed: Number(profileRes.data?.total_sol_reclaimed ?? 0),
          totalAccountsClosed: Number(
            profileRes.data?.total_accounts_closed ?? 0
          ),
          scansCount: countRes.count ?? (snapshotsRes.data?.length ?? 0),
          snapshots: (snapshotsRes.data ?? []).map((s) => ({
            id: String(s.id),
            healthScore: Number(s.health_score),
            solBalance: Number(s.sol_balance),
            emptyTokenAccounts: Number(s.empty_token_accounts),
            reclaimableSol: Number(s.reclaimable_sol),
            createdAt: String(s.created_at),
          })),
          events: (eventsRes.data ?? []).map((e) => ({
            id: String(e.id),
            txSignature: String(e.tx_signature),
            actionType: e.action_type as ReclaimLogRequest["actionType"],
            accountsClosed: Number(e.accounts_closed),
            solAmount: Number(e.sol_amount),
            explorerUrl: `https://explorer.solana.com/tx/${e.tx_signature}${clusterParam}`,
            createdAt: String(e.created_at),
          })),
        };
      }
    } catch (err) {
      console.warn("[Supabase] History fetch fallback:", err);
    }
  }

  const store = getMemoryStore();
  const profile = store.profiles.get(walletAddress);
  const walletSnapshots = store.snapshots.filter(
    (s) => s.wallet_address === walletAddress
  );
  const walletEvents = store.events.filter(
    (e) => e.wallet_address === walletAddress
  );

  return {
    walletAddress,
    totalSolReclaimed: profile?.total_sol_reclaimed ?? 0,
    totalAccountsClosed: profile?.total_accounts_closed ?? 0,
    scansCount: walletSnapshots.length,
    snapshots: walletSnapshots.slice(0, 10).map((s) => ({
      id: s.id,
      healthScore: s.health_score,
      solBalance: s.sol_balance,
      emptyTokenAccounts: s.empty_token_accounts,
      reclaimableSol: s.reclaimable_sol,
      createdAt: s.created_at,
    })),
    events: walletEvents.slice(0, 10).map((e) => ({
      id: e.id,
      txSignature: e.tx_signature,
      actionType: e.action_type,
      accountsClosed: e.accounts_closed,
      solAmount: e.sol_amount,
      explorerUrl: `https://explorer.solana.com/tx/${e.tx_signature}${clusterParam}`,
      createdAt: e.created_at,
    })),
  };
}
