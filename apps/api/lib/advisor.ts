import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  AdvisorInsight,
  AnalyzeResponse,
  AppLang,
  ProtocolSource,
  ScanResponse,
} from "./types";

const ADVISOR_SYSTEM_PROMPT = `You are SolCheck, a concise, trustworthy AI financial advisor built for Solana Mobile wallets.
You receive:
1) Verified on-chain wallet metrics (balance, empty SPL accounts with locked rent, delegations, savings vault state, deterministic health score 0-100).
2) Freshly scraped Solana ecosystem reference excerpts fetched via Firecrawl.
3) Target language: "en" (English) or "pt" (Brazilian Portuguese).

Rules:
- Output ONLY valid JSON matching the exact schema requested.
- NEVER invent numbers, APYs, or tokens not present in the input.
- Always write every user-facing string (headline, insights, voiceScript) in the target language.
- Keep "voiceScript" warm, clear, jargon-free, spoken-style, strictly between 55 and 80 words (~25-30 seconds aloud).
- Do NOT give speculative trading/gambling advice; focus on reclaiming locked rent, security hygiene, and disciplined saving.
- Provide 2 to 4 prioritized insights.`;

function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(key && !key.includes("<") && key.length > 10);
}

function buildDeterministicAdvisorFallback(
  scanData: ScanResponse,
  lang: AppLang,
  sources: ProtocolSource[],
  userQuestion?: string
): AnalyzeResponse {
  const emptyCount = scanData.emptyAccounts.length;
  const reclaimSol = scanData.totalReclaimableSol.toFixed(4);
  const solBal = scanData.solBalance.toFixed(3);
  const vaultSol = (
    scanData.vault.currentLamports / LAMPORTS_PER_SOL
  ).toFixed(3);
  const insights: AdvisorInsight[] = [];

  if (lang === "pt") {
    if (emptyCount > 0) {
      insights.push({
        severity: "high",
        title: "SOL Preso em Contas Vazias Detectado",
        detail: `Fechar ${emptyCount} conta(s) SPL vazia(s) recupera ${reclaimSol} SOL imediatamente com uma única assinatura.`,
        actionTag: "reclaim",
      });
    } else {
      insights.push({
        severity: "info",
        title: "Zero Rent Preso em Contas SPL",
        detail:
          "Sua carteira não possui contas de tokens vazias retendo depósitos de rent na Solana.",
        actionTag: "learn",
      });
    }

    if (!scanData.vault.initialized || scanData.vault.currentLamports === 0) {
      insights.push({
        severity: "medium",
        title: "Crie uma Meta de Reserva On-Chain",
        detail: `Com ${solBal} SOL na carteira, direcionar o rent recuperado para o seu Cofre PDA não-custodial cria disciplina financeira sem abrir mão da custódia.`,
        actionTag: "vault",
      });
    } else {
      insights.push({
        severity: "info",
        title: `Cofre "${scanData.vault.goalName}" Ativo (${scanData.vault.progressPercent}%)`,
        detail: `Você já acumula ${vaultSol} SOL protegidos no seu cofre Anchor on-chain.`,
        actionTag: "vault",
      });
    }

    if (scanData.delegatedAccountsCount > 0) {
      insights.push({
        severity: "high",
        title: "Revogue Delegações SPL Antigas",
        detail: `Detectamos ${scanData.delegatedAccountsCount} conta(s) com delegação ativa. Revise permissões antigas para proteger seus fundos.`,
        actionTag: "review",
      });
    }

    if (userQuestion) {
      insights.push({
        severity: "info",
        title: "Resposta Rápida SolCheck",
        detail: `Sobre "${userQuestion}": cada conta SPL trava ~0.00204 SOL de rent; ao fechá-la com saldo zero, 100% desse SOL retorna à sua carteira.`,
        actionTag: "learn",
      });
    }

    const recommendedAction: AnalyzeResponse["recommendedAction"] =
      emptyCount > 0 && !scanData.vault.initialized
        ? "reclaim_and_vault"
        : emptyCount > 0
          ? "reclaim"
          : !scanData.vault.initialized
            ? "create_vault"
            : "maintain";

    const headline =
      emptyCount > 0
        ? `Você tem ${reclaimSol} SOL presos em ${emptyCount} contas de tokens vazias.`
        : `Sua carteira está com Health Score ${scanData.healthScore}/100 e zero contas vazias.`;

    const voiceScript =
      emptyCount > 0
        ? `Olá! Aqui é o SolCheck. Sua carteira Solana está com nota ${scanData.healthScore} de 100 e saldo de ${solBal} SOL. Encontrei ${emptyCount} contas de tokens vazias prendendo ${reclaimSol} SOL em taxas de aluguel da rede. Com apenas um toque na aba Cofre, você fecha essas contas com segurança e já guarda esse valor na sua meta on-chain não-custodial, elevando sua saúde financeira imediatamente.`
        : `Olá! Aqui é o SolCheck. Excelente trabalho! Sua carteira Solana alcançou nota ${scanData.healthScore} de 100, com ${solBal} SOL disponíveis e nenhuma conta vazia prendendo recursos. Seu cofre de metas on-chain acumula ${vaultSol} SOL sob sua total custódia. Continue acompanhando seu histórico e mantendo suas reservas organizadas direto pelo celular.`;

    return {
      lang,
      headline,
      insights: insights.slice(0, 4),
      recommendedAction,
      voiceScript,
      sources,
    };
  }

  // English default
  if (emptyCount > 0) {
    insights.push({
      severity: "high",
      title: "Reclaimable Rent Detected",
      detail: `Closing ${emptyCount} empty SPL token account(s) recovers ${reclaimSol} SOL immediately with a single signature.`,
      actionTag: "reclaim",
    });
  } else {
    insights.push({
      severity: "info",
      title: "Zero Locked SPL Rent",
      detail:
        "Your wallet is clean with zero empty token accounts locking rent deposits on-chain.",
      actionTag: "learn",
    });
  }

  if (!scanData.vault.initialized || scanData.vault.currentLamports === 0) {
    insights.push({
      severity: "medium",
      title: "Idle SOL Without an Active Savings Goal",
      detail: `Based on live Solana ecosystem data, routing reclaimed SOL or part of your ${solBal} SOL balance into a dedicated non-custodial PDA vault builds disciplined reserves.`,
      actionTag: "vault",
    });
  } else {
    insights.push({
      severity: "info",
      title: `On-Chain Vault "${scanData.vault.goalName}" (${scanData.vault.progressPercent}%)`,
      detail: `You currently hold ${vaultSol} SOL safely inside your personal SolCheck Anchor vault.`,
      actionTag: "vault",
    });
  }

  if (scanData.delegatedAccountsCount > 0) {
    insights.push({
      severity: "high",
      title: "Active Token Delegations Found",
      detail: `${scanData.delegatedAccountsCount} token account(s) still grant spending authority to a delegate. Review and revoke unused approvals.`,
      actionTag: "review",
    });
  }

  if (userQuestion) {
    insights.push({
      severity: "info",
      title: "Advisor Answer",
      detail: `Regarding "${userQuestion}": every SPL token account locks ~0.00204 SOL for rent exemption. Closing zero-balance accounts returns 100% of that SOL safely to your wallet.`,
      actionTag: "learn",
    });
  }

  const recommendedAction: AnalyzeResponse["recommendedAction"] =
    emptyCount > 0 && !scanData.vault.initialized
      ? "reclaim_and_vault"
      : emptyCount > 0
        ? "reclaim"
        : !scanData.vault.initialized
          ? "create_vault"
          : "maintain";

  const headline =
    emptyCount > 0
      ? `You have ${reclaimSol} SOL locked across ${emptyCount} empty token accounts.`
      : `Your wallet scores ${scanData.healthScore}/100 with zero empty token accounts.`;

  const voiceScript =
    emptyCount > 0
      ? `Hey there! Your SolCheck wallet score is ${scanData.healthScore} out of 100, with a balance of ${solBal} SOL. Right now, ${reclaimSol} SOL is sitting locked inside ${emptyCount} empty token accounts as refundable network rent. With one tap in the Vault tab, you can close those empty accounts and route the recovered SOL straight into your non-custodial savings goal on Solana.`
      : `Hey there! Great news from SolCheck. Your wallet health score is ${scanData.healthScore} out of 100, with ${solBal} SOL in your wallet and zero empty token accounts leaking rent. Your non-custodial savings vault currently holds ${vaultSol} SOL toward your goal. Keep building your reserve consistently while staying one hundred percent in control of your keys.`;

  return {
    lang,
    headline,
    insights: insights.slice(0, 4),
    recommendedAction,
    voiceScript,
    sources,
  };
}

export async function generateWalletDiagnosis(params: {
  scanData: ScanResponse;
  lang: AppLang;
  researchContext: string;
  sources: ProtocolSource[];
  userQuestion?: string;
}): Promise<AnalyzeResponse> {
  const { scanData, lang, researchContext, sources, userQuestion } = params;

  if (!isGroqConfigured()) {
    return buildDeterministicAdvisorFallback(
      scanData,
      lang,
      sources,
      userQuestion
    );
  }

  const userPayload = {
    targetLanguage: lang === "pt" ? "pt (Brazilian Portuguese)" : "en (English)",
    userQuestion: userQuestion || null,
    walletMetrics: {
      solBalance: scanData.solBalance,
      healthScore: scanData.healthScore,
      status: scanData.status,
      emptyAccountsCount: scanData.emptyAccounts.length,
      totalReclaimableSol: scanData.totalReclaimableSol,
      activeTokenAccountsCount: scanData.activeTokenAccountsCount,
      delegatedAccountsCount: scanData.delegatedAccountsCount,
      riskFlags: scanData.riskFlags,
      vault: {
        initialized: scanData.vault.initialized,
        goalName: scanData.vault.goalName,
        currentSol: Number(
          (scanData.vault.currentLamports / LAMPORTS_PER_SOL).toFixed(6)
        ),
        targetSol: Number(
          (scanData.vault.targetLamports / LAMPORTS_PER_SOL).toFixed(6)
        ),
        progressPercent: scanData.vault.progressPercent,
      },
    },
    firecrawlLiveContext: researchContext,
    requiredJsonSchema: {
      headline: "string (1 crisp sentence summarizing wallet state)",
      insights: [
        {
          severity: "high | medium | info",
          title: "string",
          detail: "string",
          actionTag: "reclaim | vault | review | learn",
        },
      ],
      recommendedAction: "reclaim_and_vault | reclaim | create_vault | maintain",
      voiceScript:
        "string (strictly 55 to 80 words, spoken natural style in targetLanguage)",
    },
  };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ADVISOR_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`Groq HTTP ${res.status}`);
    }

    const completion = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty LLM content");
    }

    const parsed = JSON.parse(rawContent) as Partial<AnalyzeResponse>;
    if (
      !parsed.headline ||
      !Array.isArray(parsed.insights) ||
      !parsed.voiceScript
    ) {
      throw new Error("Malformed JSON fields from LLM");
    }

    const validActions = new Set([
      "reclaim_and_vault",
      "reclaim",
      "create_vault",
      "maintain",
    ]);
    const recommendedAction = validActions.has(parsed.recommendedAction ?? "")
      ? (parsed.recommendedAction as AnalyzeResponse["recommendedAction"])
      : scanData.emptyAccounts.length > 0
        ? "reclaim_and_vault"
        : "maintain";

    return {
      lang,
      headline: String(parsed.headline),
      insights: parsed.insights.slice(0, 4).map((item) => ({
        severity:
          item.severity === "high" ||
          item.severity === "medium" ||
          item.severity === "info"
            ? item.severity
            : "info",
        title: String(item.title ?? ""),
        detail: String(item.detail ?? ""),
        actionTag: item.actionTag,
      })),
      recommendedAction,
      voiceScript: String(parsed.voiceScript),
      sources,
    };
  } catch (err) {
    console.warn("[Advisor] Falling back to deterministic advisor:", err);
    return buildDeterministicAdvisorFallback(
      scanData,
      lang,
      sources,
      userQuestion
    );
  }
}
