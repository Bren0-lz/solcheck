export const en = {
  appName: "SolCheck",
  appSubtitle: "AI Wallet Advisor & Rent Reclaim on Solana",
  connectBtn: "Connect Wallet (Seeker / Phantom)",
  connectingBtn: "Connecting...",
  disconnectBtn: "Disconnect Wallet",
  devnetBadge: "Solana Devnet",
  tabs: {
    xray: "X-Ray",
    advisor: "Advisor",
    vault: "Vault",
    history: "History",
  },
  status: {
    healthy: "Healthy",
    needs_attention: "Needs Attention",
    leaking_value: "Leaking Value",
  },
  xray: {
    refresh: "Refresh",
    scanning: "Scanning Solana RPC...",
    solBalance: "SOL Balance",
    healthScore: "Wallet Health Score",
    lockedTitle: "Locked Rent Found",
    lockedDesc: "{sol} SOL locked across {count} empty token accounts",
    cleanTitle: "Zero Locked Rent",
    cleanDesc: "No empty SPL token accounts locking rent deposits.",
    reclaimCta: "Reclaim SOL Now →",
    vaultSummaryTitle: "Savings Goal Vault",
    createGoalCta: "Create Savings Goal →",
    playBriefingMini: "Play 30s AI Briefing",
    stopBriefingMini: "Stop Briefing",
  },
  advisor: {
    title: "AI Financial Advisor",
    voiceTitle: "30s Voice Briefing",
    poweredByEleven: "Powered by ElevenLabs",
    playBtn: "Play Briefing",
    pauseBtn: "Stop Audio",
    loadingVoice: "Synthesizing...",
    insightsTitle: "Prioritized Insights",
    liveSourcesTitle: "Live Sources via Firecrawl",
    refreshLiveBtn: "Refresh Live Data",
    analyzing: "Fetching live Solana protocol data & running AI diagnosis...",
    quickQuestionsTitle: "Quick Questions",
    questions: [
      "How does rent work?",
      "Is my wallet safe?",
      "How much should I save?",
    ],
  },
  vault: {
    reclaimSectionTitle: "Empty SPL Accounts (Rent Reclaim)",
    selectBatchHint: "Up to 10 accounts per atomic transaction",
    noEmptyAccounts: "Your wallet has 0 empty SPL token accounts to close.",
    reclaimOnlyBtn: "Reclaim {sol} SOL to Wallet",
    reclaimAndVaultBtn: "Reclaim & Save to Goal Vault",
    vaultSectionTitle: "On-Chain Goal Vault (Anchor PDA)",
    goalNameLabel: "Goal Name (max 32 chars)",
    goalNamePlaceholder: "e.g. SOL Reserve",
    targetSolLabel: "Target Amount (SOL)",
    createVaultBtn: "Create On-Chain Vault",
    currentSaved: "Saved Balance",
    reclaimedRouted: "From Rent Reclaim",
    depositPlaceholder: "Amount in SOL (e.g. 0.05)",
    depositBtn: "Deposit SOL",
    withdrawBtn: "Withdraw SOL",
    viewExplorer: "View Vault on Solana Explorer ↗",
    txSuccessTitle: "Transaction Confirmed!",
    openTxExplorer: "View Tx on Solana Explorer ↗",
  },
  history: {
    title: "History & Progress",
    totalReclaimed: "Total SOL Reclaimed",
    accountsClosed: "Empty Accounts Closed",
    scansRun: "Scans Run",
    scoreEvolution: "Health Score Evolution",
    txLogTitle: "Verifiable On-Chain Log",
    noEvents: "No reclaim or vault transactions recorded yet.",
    languageLabel: "App & Voice Language",
  },
  common: {
    connectPrompt: "Connect your Solana Mobile wallet on the X-Ray tab to start.",
    signingTx: "Approve signature in your wallet...",
  },
};

export type Dictionary = {
  appName: string;
  appSubtitle: string;
  connectBtn: string;
  connectingBtn: string;
  disconnectBtn: string;
  devnetBadge: string;
  tabs: {
    xray: string;
    advisor: string;
    vault: string;
    history: string;
  };
  status: {
    healthy: string;
    needs_attention: string;
    leaking_value: string;
  };
  xray: {
    refresh: string;
    scanning: string;
    solBalance: string;
    healthScore: string;
    lockedTitle: string;
    lockedDesc: string;
    cleanTitle: string;
    cleanDesc: string;
    reclaimCta: string;
    vaultSummaryTitle: string;
    createGoalCta: string;
    playBriefingMini: string;
    stopBriefingMini: string;
  };
  advisor: {
    title: string;
    voiceTitle: string;
    poweredByEleven: string;
    playBtn: string;
    pauseBtn: string;
    loadingVoice: string;
    insightsTitle: string;
    liveSourcesTitle: string;
    refreshLiveBtn: string;
    analyzing: string;
    quickQuestionsTitle: string;
    questions: string[];
  };
  vault: {
    reclaimSectionTitle: string;
    selectBatchHint: string;
    noEmptyAccounts: string;
    reclaimOnlyBtn: string;
    reclaimAndVaultBtn: string;
    vaultSectionTitle: string;
    goalNameLabel: string;
    goalNamePlaceholder: string;
    targetSolLabel: string;
    createVaultBtn: string;
    currentSaved: string;
    reclaimedRouted: string;
    depositPlaceholder: string;
    depositBtn: string;
    withdrawBtn: string;
    viewExplorer: string;
    txSuccessTitle: string;
    openTxExplorer: string;
  };
  history: {
    title: string;
    totalReclaimed: string;
    accountsClosed: string;
    scansRun: string;
    scoreEvolution: string;
    txLogTitle: string;
    noEvents: string;
    languageLabel: string;
  };
  common: {
    connectPrompt: string;
    signingTx: string;
  };
};
