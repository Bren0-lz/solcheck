import { AppLang } from "../types/api";

export function formatWalletOrRpcError(err: unknown, lang: AppLang): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  // 1. User rejected / dismissed MWA prompt in Phantom or Seeker
  if (
    lower.includes("cancel") ||
    lower.includes("declined") ||
    lower.includes("rejected") ||
    lower.includes("user_rejected") ||
    lower.includes("session_closed") ||
    lower.includes("authorization failed")
  ) {
    return lang === "pt"
      ? "Assinatura cancelada na carteira. Nenhum fundo foi movimentado."
      : "Signature cancelled in wallet. Your funds were not moved.";
  }

  // 2. No MWA wallet installed on Android device
  if (
    lower.includes("found no installed wallet") ||
    lower.includes("activitynotfound") ||
    lower.includes("no wallet")
  ) {
    return lang === "pt"
      ? "Nenhuma carteira Solana Mobile encontrada. Instale o Phantom ou Solflare no Android (modo Devnet)."
      : "No Solana Mobile wallet found. Install Phantom or Solflare on Android and enable Devnet.";
  }

  // 3. Anchor InsufficientVaultBalance (custom error 6002 / 0x1772)
  if (lower.includes("0x1772") || lower.includes("insufficientvaultbalance")) {
    return lang === "pt"
      ? "Saldo sacável insuficiente no Cofre (o mínimo de isenção de rent do PDA é preservado)."
      : "Insufficient withdrawable balance in Vault (PDA rent-exempt minimum is preserved).";
  }

  // 4. Insufficient SOL for transaction fee or transfer
  if (lower.includes("insufficient lamports") || lower.includes("custom program error: 0x1")) {
    return lang === "pt"
      ? "Saldo de SOL insuficiente na carteira para cobrir o valor e a taxa de rede."
      : "Insufficient SOL balance in wallet to cover the amount and network fee.";
  }

  // 5. RPC Rate Limit (429)
  if (lower.includes("429") || lower.includes("too many requests")) {
    return lang === "pt"
      ? "O RPC da Solana atingiu limite temporário (429). Aguarde alguns segundos e tente novamente."
      : "Solana RPC rate limit reached (429). Wait a few seconds and try again.";
  }

  return raw || (lang === "pt" ? "Ocorreu um erro inesperado." : "An unexpected error occurred.");
}
