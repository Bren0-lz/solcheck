import {
  Connection,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  PublicKey,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  EmptyTokenAccount,
  HealthStatus,
  RiskFlag,
  SolanaCluster,
  VaultState,
} from "./types";

const SYSTEM_PLACEHOLDER_ID = "11111111111111111111111111111111";
const DEFAULT_DEVNET_VAULT_PROGRAM_ID =
  "7RCowC83nUELZmnPxC9PDZZpDAKprF5GGtuRnqc913Gp";
const VAULT_ACCOUNT_DISCRIMINATOR = Buffer.from([
  230, 251, 241, 83, 139, 202, 93, 28,
]);

export function getRpcUrl(cluster: SolanaCluster = "devnet"): string {
  if (cluster === "mainnet-beta") {
    return (
      process.env.SOLANA_MAINNET_RPC_URL ||
      "https://api.mainnet-beta.solana.com"
    );
  }
  const envUrl = process.env.SOLANA_RPC_URL;
  if (envUrl && envUrl.startsWith("http") && !envUrl.includes("<")) {
    return envUrl;
  }
  return "https://api.devnet.solana.com";
}

export function getConnection(cluster: SolanaCluster = "devnet"): Connection {
  return new Connection(getRpcUrl(cluster), "confirmed");
}

export function getVaultProgramId(): PublicKey | null {
  const raw = process.env.SOLCHECK_VAULT_PROGRAM_ID?.trim();
  const candidate =
    !raw || raw === SYSTEM_PLACEHOLDER_ID || raw.includes("<")
      ? DEFAULT_DEVNET_VAULT_PROGRAM_ID
      : raw;
  try {
    return new PublicKey(candidate);
  } catch {
    return null;
  }
}

export function decodeVaultAccountData(
  data: Buffer,
  pda: PublicKey,
  accountLamports: number,
  rentExemptMinimum: number
): VaultState | null {
  if (data.length < 81) {
    return null;
  }

  const disc = data.subarray(0, 8);
  if (!disc.equals(VAULT_ACCOUNT_DISCRIMINATOR)) {
    return null;
  }

  const goalNameLen = data.readUInt32LE(40);
  if (goalNameLen > 64 || 44 + goalNameLen + 33 > data.length) {
    return null;
  }

  const goalName = data.subarray(44, 44 + goalNameLen).toString("utf8");
  const offset = 44 + goalNameLen;

  const targetLamports = Number(data.readBigUInt64LE(offset));
  const totalDepositedLamports = Number(data.readBigUInt64LE(offset + 8));
  const totalReclaimedRoutedLamports = Number(data.readBigUInt64LE(offset + 16));
  const createdAt = Number(data.readBigInt64LE(offset + 24));

  const currentLamports = Math.max(0, accountLamports - rentExemptMinimum);
  const progressPercent =
    targetLamports > 0
      ? Math.min(100, Math.round((currentLamports / targetLamports) * 100))
      : 0;

  return {
    initialized: true,
    pda: pda.toBase58(),
    goalName,
    targetLamports,
    currentLamports,
    totalDepositedLamports,
    totalReclaimedRoutedLamports,
    progressPercent,
    createdAt,
  };
}

export async function readVaultState(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<VaultState> {
  const programId = getVaultProgramId();

  if (!programId) {
    // Program not yet deployed or configured; compute deterministic preview PDA against System placeholder
    const [fallbackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), ownerPubkey.toBuffer()],
      new PublicKey(SYSTEM_PLACEHOLDER_ID)
    );
    return {
      initialized: false,
      pda: fallbackPda.toBase58(),
      goalName: null,
      targetLamports: 0,
      currentLamports: 0,
      totalDepositedLamports: 0,
      totalReclaimedRoutedLamports: 0,
      progressPercent: 0,
      createdAt: null,
    };
  }

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), ownerPubkey.toBuffer()],
    programId
  );

  const accountInfo = await connection.getAccountInfo(vaultPda);
  if (!accountInfo || !accountInfo.owner.equals(programId)) {
    return {
      initialized: false,
      pda: vaultPda.toBase58(),
      goalName: null,
      targetLamports: 0,
      currentLamports: 0,
      totalDepositedLamports: 0,
      totalReclaimedRoutedLamports: 0,
      progressPercent: 0,
      createdAt: null,
    };
  }

  const rentExemptMin = await connection.getMinimumBalanceForRentExemption(
    accountInfo.data.length
  );
  const decoded = decodeVaultAccountData(
    Buffer.from(accountInfo.data),
    vaultPda,
    accountInfo.lamports,
    rentExemptMin
  );

  if (!decoded) {
    return {
      initialized: false,
      pda: vaultPda.toBase58(),
      goalName: null,
      targetLamports: 0,
      currentLamports: 0,
      totalDepositedLamports: 0,
      totalReclaimedRoutedLamports: 0,
      progressPercent: 0,
      createdAt: null,
    };
  }

  return decoded;
}

function hasWithheldToken2022Fees(info: Record<string, unknown>): boolean {
  const extensions = info.extensions;
  if (!Array.isArray(extensions)) return false;
  for (const ext of extensions) {
    if (
      ext &&
      typeof ext === "object" &&
      (ext as { extension?: string }).extension === "transferFeeAmount"
    ) {
      const state = (ext as { state?: { withheldAmount?: number | string } })
        .state;
      if (state && Number(state.withheldAmount ?? 0) > 0) {
        return true;
      }
    }
  }
  return false;
}

export function computeHealthScoreAndFlags(params: {
  solBalance: number;
  emptyAccountsCount: number;
  totalReclaimableSol: number;
  activeTokenAccountsCount: number;
  delegatedAccountsCount: number;
  vault: VaultState;
}): {
  healthScore: number;
  status: HealthStatus;
  riskFlags: RiskFlag[];
} {
  let score = 100;
  const riskFlags: RiskFlag[] = [];

  // 1. Penalty for locked rent in empty SPL token accounts: -4 pts each (cap -36)
  if (params.emptyAccountsCount > 0) {
    const penalty = Math.min(36, params.emptyAccountsCount * 4);
    score -= penalty;
    riskFlags.push({
      code: "LOCKED_RENT",
      severity: params.emptyAccountsCount >= 3 ? "high" : "medium",
      value: `${params.emptyAccountsCount} accounts / ${params.totalReclaimableSol.toFixed(4)} SOL`,
    });
  }

  // 2. Penalty for idle SOL without active vault reserve: -15 pts
  if (params.solBalance > 0.5 && params.vault.currentLamports === 0) {
    score -= 15;
    riskFlags.push({
      code: "IDLE_SOL",
      severity: "medium",
      value: `${params.solBalance.toFixed(3)} SOL idle`,
    });
  }

  if (!params.vault.initialized) {
    riskFlags.push({
      code: "NO_SAVINGS_GOAL",
      severity: "info",
      value: "No active on-chain savings goal",
    });
  }

  // 3. Penalty for active SPL token delegations: -10 pts each (cap -20)
  if (params.delegatedAccountsCount > 0) {
    const penalty = Math.min(20, params.delegatedAccountsCount * 10);
    score -= penalty;
    riskFlags.push({
      code: "ACTIVE_DELEGATION",
      severity: "high",
      value: `${params.delegatedAccountsCount} delegated account(s)`,
    });
  }

  // 4. Penalty for extreme concentration: active_token_accounts <= 1 and sol_balance > 1 -> -10 pts
  if (params.activeTokenAccountsCount <= 1 && params.solBalance > 1) {
    score -= 10;
    riskFlags.push({
      code: "HIGH_CONCENTRATION",
      severity: "info",
      value: `${params.solBalance.toFixed(2)} SOL concentrated`,
    });
  }

  // 5. Bonus for on-chain savings discipline: +10 pts if vault active with deposit > 0
  if (params.vault.initialized && params.vault.currentLamports > 0) {
    score += 10;
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(score)));
  const status: HealthStatus =
    healthScore >= 80
      ? "healthy"
      : healthScore >= 50
        ? "needs_attention"
        : "leaking_value";

  return { healthScore, status, riskFlags };
}

export async function scanSolanaWallet(
  walletAddress: string,
  cluster: SolanaCluster = "devnet"
): Promise<{
  walletAddress: string;
  cluster: SolanaCluster;
  solBalance: number;
  solLamports: number;
  activeTokenAccountsCount: number;
  emptyAccounts: EmptyTokenAccount[];
  totalReclaimableLamports: number;
  totalReclaimableSol: number;
  delegatedAccountsCount: number;
  healthScore: number;
  status: HealthStatus;
  riskFlags: RiskFlag[];
  vault: VaultState;
}> {
  const pubkey = new PublicKey(walletAddress);
  const connection = getConnection(cluster);

  const [solLamports, splLegacyRes, spl2022Res, vault] = await Promise.all([
    connection.getBalance(pubkey),
    connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    }),
    connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    readVaultState(connection, pubkey),
  ]);

  const emptyAccounts: EmptyTokenAccount[] = [];
  let activeTokenAccountsCount = 0;
  let delegatedAccountsCount = 0;

  const combined = [
    ...splLegacyRes.value.map((item) => ({
      ...item,
      programIdStr: TOKEN_PROGRAM_ID.toBase58(),
    })),
    ...spl2022Res.value.map((item) => ({
      ...item,
      programIdStr: TOKEN_2022_PROGRAM_ID.toBase58(),
    })),
  ];

  for (const entry of combined) {
    const parsedData = entry.account.data as ParsedAccountData;
    const info = parsedData?.parsed?.info as
      | {
          mint?: string;
          owner?: string;
          state?: string;
          delegate?: string | null;
          closeAuthority?: string | null;
          tokenAmount?: { amount?: string; uiAmount?: number | null };
          extensions?: unknown[];
        }
      | undefined;

    if (!info) continue;

    if (info.delegate) {
      delegatedAccountsCount += 1;
    }

    const rawAmount = info.tokenAmount?.amount ?? "0";
    if (rawAmount === "0") {
      const isFrozen = info.state === "frozen";
      const validCloseAuth =
        info.closeAuthority == null || info.closeAuthority === pubkey.toBase58();
      const withheldFees = hasWithheldToken2022Fees(
        info as unknown as Record<string, unknown>
      );

      if (!isFrozen && validCloseAuth && !withheldFees && info.mint) {
        emptyAccounts.push({
          pubkey: entry.pubkey.toBase58(),
          mint: info.mint,
          programId: entry.programIdStr,
          reclaimableLamports: entry.account.lamports,
        });
      }
    } else {
      activeTokenAccountsCount += 1;
    }
  }

  const totalReclaimableLamports = emptyAccounts.reduce(
    (sum, acc) => sum + acc.reclaimableLamports,
    0
  );
  const totalReclaimableSol = Number(
    (totalReclaimableLamports / LAMPORTS_PER_SOL).toFixed(9)
  );
  const solBalance = Number((solLamports / LAMPORTS_PER_SOL).toFixed(9));

  const { healthScore, status, riskFlags } = computeHealthScoreAndFlags({
    solBalance,
    emptyAccountsCount: emptyAccounts.length,
    totalReclaimableSol,
    activeTokenAccountsCount,
    delegatedAccountsCount,
    vault,
  });

  return {
    walletAddress: pubkey.toBase58(),
    cluster,
    solBalance,
    solLamports,
    activeTokenAccountsCount,
    emptyAccounts,
    totalReclaimableLamports,
    totalReclaimableSol,
    delegatedAccountsCount,
    healthScore,
    status,
    riskFlags,
    vault,
  };
}
