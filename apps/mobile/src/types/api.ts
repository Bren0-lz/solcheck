export type AppLang = "en" | "pt";
export type SolanaCluster = "devnet" | "mainnet-beta";
export type HealthStatus = "healthy" | "needs_attention" | "leaking_value";
export type InsightSeverity = "high" | "medium" | "info";
export type VaultActionType =
  | "reclaim"
  | "reclaim_and_vault"
  | "vault_deposit"
  | "vault_withdraw";

export interface EmptyTokenAccount {
  pubkey: string;              // Base58 da ATA vazia
  mint: string;                // Base58 do Mint do token
  programId: string;           // TOKEN_PROGRAM_ID ou TOKEN_2022_PROGRAM_ID
  reclaimableLamports: number; // Geralmente 2039280 (~0.00203928 SOL)
}

export interface VaultState {
  initialized: boolean;
  pda: string;
  goalName: string | null;
  targetLamports: number;
  currentLamports: number;         // Saldo sacável (lamports totais - rentExemptMin)
  totalDepositedLamports: number;
  totalReclaimedRoutedLamports: number;
  progressPercent: number;         // 0..100
  createdAt: number | null;        // Unix timestamp (segundos)
}

export interface RiskFlag {
  code:
    | "LOCKED_RENT"
    | "IDLE_SOL"
    | "ACTIVE_DELEGATION"
    | "HIGH_CONCENTRATION"
    | "NO_SAVINGS_GOAL";
  severity: InsightSeverity;
  value: string; // Ex.: "8 accounts / 0.0163 SOL"
}

export interface ScanRequest {
  walletAddress: string;
  cluster?: SolanaCluster; // default: "devnet"
}

export interface ScanResponse {
  snapshotId: string;
  walletAddress: string;
  cluster: SolanaCluster;
  solBalance: number;
  solLamports: number;
  activeTokenAccountsCount: number;
  emptyAccounts: EmptyTokenAccount[];
  totalReclaimableLamports: number;
  totalReclaimableSol: number;
  delegatedAccountsCount: number;
  healthScore: number; // 0..100
  status: HealthStatus;
  riskFlags: RiskFlag[];
  vault: VaultState;
  scannedAt: string;   // ISO string
}

export interface ProtocolSource {
  slug: string;
  name: string;
  url: string;
  fetchedAt: string;
  cached: boolean;
}

export interface AdvisorInsight {
  severity: InsightSeverity;
  title: string;
  detail: string;
  actionTag?: "reclaim" | "vault" | "review" | "learn";
}

export interface AnalyzeRequest {
  walletAddress: string;
  lang: AppLang;
  scanData: ScanResponse;
  forceRefreshFirecrawl?: boolean;
  userQuestion?: string;
}

export interface AnalyzeResponse {
  lang: AppLang;
  headline: string;
  insights: AdvisorInsight[];
  recommendedAction: "reclaim_and_vault" | "reclaim" | "create_vault" | "maintain";
  voiceScript: string; // 65–80 palavras (~25–30s de áudio)
  sources: ProtocolSource[];
}

export interface BriefingRequest {
  text: string;
  lang: AppLang;
}

export interface BriefingResponse {
  audioBase64: string; // MP3 em base64 (sem prefixo data:)
  mimeType: "audio/mpeg";
  lang: AppLang;
  charCount: number;
}

export interface ReclaimLogRequest {
  walletAddress: string;
  txSignature: string;
  actionType: VaultActionType;
  accountsClosed: number;
  solAmount: number;
}

export interface HistoryResponse {
  walletAddress: string;
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  scansCount: number;
  snapshots: Array<{
    id: string;
    healthScore: number;
    solBalance: number;
    emptyTokenAccounts: number;
    reclaimableSol: number;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    txSignature: string;
    actionType: VaultActionType;
    accountsClosed: number;
    solAmount: number;
    explorerUrl: string;
    createdAt: string;
  }>;
}
