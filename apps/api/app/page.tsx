"use client";

import React, { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Download,
  ExternalLink,
  Play,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Square,
  Vault,
  Volume2,
} from "lucide-react";
import type {
  AnalyzeResponse,
  AppLang,
  BriefingResponse,
  HistoryResponse,
  ScanResponse,
  SolanaCluster,
} from "@/lib/types";

// Official Solana Devnet Demo Wallet fallback if NEXT_PUBLIC_DEMO_WALLET is not set
const FALLBACK_DEMO_WALLET = "8TKsaw8oz9J9oJqugDpJb8rYCNLLrudFgCo6EyYorsXw";

const COPY = {
  en: {
    brandTag: "Solana Wallet Audit & Rent Reclaim",
    downloadApk: "Android APK",
    eyebrow: "On-chain diagnostic · Non-custodial",
    heroTitle: "Audit any Solana wallet and reclaim locked rent.",
    heroSub:
      "Inspect zero-balance SPL & Token-2022 accounts holding refundable SOL, verify ecosystem context via Firecrawl, hear a 30-second voice briefing, and route reclaimed SOL into an Anchor vault on Android.",
    placeholder: "Paste a Solana wallet address (Base58)...",
    scanBtn: "Run Audit",
    scanningBtn: "Scanning RPC...",
    tryDemoBtn: "Load Demo Wallet",
    clusterHint: "Read-only public RPC · Signing happens locally on Solana Mobile (MWA)",
    specs: [
      {
        num: "01",
        title: "Empty Account Detection",
        desc: "Finds zero-balance SPL and Token-2022 ATAs locking ~0.00203 SOL in rent each.",
      },
      {
        num: "02",
        title: "Live Research & Voice",
        desc: "Grounds wallet advice in live Firecrawl sources with a 30s ElevenLabs briefing.",
      },
      {
        num: "03",
        title: "Atomic Anchor Vault",
        desc: "Close empty accounts and deposit reclaimed SOL into a PDA vault in one MWA signature.",
      },
    ],
    ledgerTitle: "Audit Output Specification",
    ledgerRows: [
      {
        key: "Health Score",
        sub: "Weighted hygiene score from rent lockups, balance & delegations",
        val: "0 – 100",
      },
      {
        key: "Closable SPL ATAs",
        sub: "SPL Token & Token-2022 accounts with zero token balance",
        val: "~0.00203 SOL / ATA",
      },
      {
        key: "Voice Briefing",
        sub: "Spoken summary generated from live on-chain state",
        val: "30s · EN / PT",
      },
      {
        key: "Savings Vault (PDA)",
        sub: "Non-custodial Anchor program state & progress tracking",
        val: "On-chain PDA",
      },
      {
        key: "Snapshot History",
        sub: "Score evolution and logged reclaim transactions",
        val: "Supabase",
      },
    ],
    mobileTitle: "Execute Reclaim on Solana Mobile",
    mobileDesc:
      "This web inspector is strictly read-only. Install the Android APK to sign with Phantom or Solana Seeker (MWA) and move reclaimed rent straight into your Anchor savings vault.",
    mobileCta: "Download latest Android APK",
    newScan: "Reset",
    explorer: "Explorer",
    healthScore: "Health Score",
    solBalance: "SOL Balance",
    reclaimableRent: "Reclaimable Rent",
    emptyAtas: "Empty Accounts",
    activeTokens: "Active Tokens",
    delegations: "delegated",
    healthy: "Healthy",
    needs_attention: "Needs Attention",
    leaking_value: "Leaking Value",
    lockedFound: "SOL locked across empty SPL token accounts",
    cleanWallet: "Zero empty SPL token accounts locking rent.",
    mobileActionNote:
      "Use the SolCheck Android APK (Phantom / Solana Seeker MWA) to close empty accounts and route SOL into your Anchor vault in 1 atomic signature.",
    advisorTitle: "Wallet Briefing & Findings",
    analyzing: "Fetching live Firecrawl sources and generating diagnosis...",
    playBriefing: "Play 30s Briefing",
    stopBriefing: "Stop Audio",
    loadingAudio: "Generating Voice...",
    browserTtsNote:
      "Playing via browser speech fallback (set ELEVENLABS_API_KEY on server for ElevenLabs Multilingual v2 MP3).",
    quickQuestions: [
      "How does Solana rent work?",
      "Is my wallet safe?",
      "How much emergency SOL should I save?",
    ],
    liveSources: "Sources",
    refreshLive: "Refresh Sources",
    reclaimSection: "Rent Status & Risk Flags",
    vaultTitle: "Anchor Savings Vault (PDA)",
    vaultUninitialized: "Not initialized yet for this wallet.",
    emptyTableTitle: "Closable Zero-Balance SPL Accounts",
    historyTitle: "Snapshot History",
    totalReclaimed: "Reclaimed",
    accountsClosed: "Closed",
    scansRun: "Scans",
    noEventsYet: "No on-chain reclaim or vault transactions logged yet.",
  },
  pt: {
    brandTag: "Auditoria de Carteira Solana & Resgate de Rent",
    downloadApk: "APK Android",
    eyebrow: "Diagnóstico on-chain · Não-custodial",
    heroTitle: "Audite qualquer carteira Solana e resgate SOL preso.",
    heroSub:
      "Encontre contas SPL e Token-2022 vazias segurando rent reembolsável, valide o contexto com fontes ao vivo via Firecrawl, ouça um briefing de 30s e envie o valor recuperado para um cofre Anchor no Android.",
    placeholder: "Cole um endereço de carteira Solana (Base58)...",
    scanBtn: "Auditar",
    scanningBtn: "Lendo RPC...",
    tryDemoBtn: "Carregar Carteira Demo",
    clusterHint: "Leitura pública on-chain · Assinaturas acontecem localmente no Solana Mobile (MWA)",
    specs: [
      {
        num: "01",
        title: "Contas Vazias (ATAs)",
        desc: "Detecta contas SPL e Token-2022 zeradas prendendo ~0.00203 SOL de rent cada.",
      },
      {
        num: "02",
        title: "Fontes ao Vivo & Voz",
        desc: "Cruza dados do ecossistema via Firecrawl com um briefing em áudio de 30s no ElevenLabs.",
      },
      {
        num: "03",
        title: "Cofre Anchor Atômico",
        desc: "Feche contas vazias e deposite o SOL resgatado no cofre PDA em 1 assinatura MWA.",
      },
    ],
    ledgerTitle: "O que a auditoria retorna",
    ledgerRows: [
      {
        key: "Health Score",
        sub: "Nota de saúde calculada por rent preso, saldo e delegações",
        val: "0 – 100",
      },
      {
        key: "Contas SPL Fecháveis",
        sub: "Contas SPL Token e Token-2022 com saldo zerado",
        val: "~0.00203 SOL / ATA",
      },
      {
        key: "Briefing em Voz",
        sub: "Resumo falado gerado a partir do estado real on-chain",
        val: "30s · EN / PT",
      },
      {
        key: "Cofre de Metas (PDA)",
        sub: "Estado do programa Anchor não-custodial e progresso da meta",
        val: "PDA On-chain",
      },
      {
        key: "Histórico de Scans",
        sub: "Evolução do score e transações de resgate registradas",
        val: "Supabase",
      },
    ],
    mobileTitle: "Execute o Resgate no Solana Mobile",
    mobileDesc:
      "Este inspetor web é apenas leitura. Instale o APK Android para assinar com Phantom ou Solana Seeker (MWA) e mover o rent recuperado direto para seu cofre Anchor.",
    mobileCta: "Baixar APK Android mais recente",
    newScan: "Limpar",
    explorer: "Explorer",
    healthScore: "Health Score",
    solBalance: "Saldo em SOL",
    reclaimableRent: "SOL Recuperável",
    emptyAtas: "Contas Vazias",
    activeTokens: "Tokens Ativos",
    delegations: "delegadas",
    healthy: "Saudável",
    needs_attention: "Atenção",
    leaking_value: "Perdendo Valor",
    lockedFound: "SOL preso em contas SPL vazias",
    cleanWallet: "Zero contas SPL vazias prendendo rent.",
    mobileActionNote:
      "Use o APK Android do SolCheck (Phantom / Solana Seeker MWA) para fechar contas vazias e guardar no Cofre Anchor em 1 assinatura atômica.",
    advisorTitle: "Briefing & Diagnóstico",
    analyzing: "Buscando fontes ao vivo no Firecrawl e gerando diagnóstico...",
    playBriefing: "Ouvir Briefing de 30s",
    stopBriefing: "Parar Áudio",
    loadingAudio: "Gerando Voz...",
    browserTtsNote:
      "Reproduzindo via voz do navegador (configure ELEVENLABS_API_KEY no servidor para MP3 ElevenLabs Multilingual v2).",
    quickQuestions: [
      "Como funciona o rent na Solana?",
      "Minha carteira está segura?",
      "Quanto devo guardar na reserva?",
    ],
    liveSources: "Fontes",
    refreshLive: "Atualizar Fontes",
    reclaimSection: "Status de Rent & Alertas",
    vaultTitle: "Cofre de Metas (Anchor PDA)",
    vaultUninitialized: "Ainda não inicializado para esta carteira.",
    emptyTableTitle: "Contas SPL Vazias Prontas para Fechar",
    historyTitle: "Histórico de Snapshots",
    totalReclaimed: "Resgatado",
    accountsClosed: "Fechadas",
    scansRun: "Scans",
    noEventsYet: "Nenhuma transação de resgate ou cofre registrada ainda.",
  },
} as const;

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
}

export default function SolCheckWebPreviewPage() {
  const [lang, setLang] = useState<AppLang>("en");
  const [cluster, setCluster] = useState<SolanaCluster>("devnet");
  const [walletInput, setWalletInput] = useState<string>(
    process.env.NEXT_PUBLIC_DEMO_WALLET || ""
  );
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [usedFallbackSpeech, setUsedFallbackSpeech] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = COPY[lang];
  const apkUrl =
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ||
    "https://github.com/Bren0-lz/solcheck/releases/latest";
  const demoWallet =
    process.env.NEXT_PUBLIC_DEMO_WALLET &&
    !process.env.NEXT_PUBLIC_DEMO_WALLET.includes("<")
      ? process.env.NEXT_PUBLIC_DEMO_WALLET
      : FALLBACK_DEMO_WALLET;

  function stopCurrentAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }

  async function fetchHistory(walletAddr: string, targetCluster: SolanaCluster) {
    try {
      const res = await fetch(
        `/api/history?wallet=${encodeURIComponent(walletAddr)}&cluster=${targetCluster}`
      );
      if (res.ok) {
        const json = (await res.json()) as HistoryResponse;
        setHistoryData(json);
      }
    } catch {
      // Non-critical in web preview
    }
  }

  async function runAnalysis(
    targetScan: ScanResponse,
    targetLang: AppLang,
    options?: { forceRefreshFirecrawl?: boolean; userQuestion?: string }
  ) {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: targetScan.walletAddress,
          lang: targetLang,
          scanData: targetScan,
          forceRefreshFirecrawl: options?.forceRefreshFirecrawl ?? false,
          userQuestion: options?.userQuestion,
        }),
      });
      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze wallet.");
      }
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze wallet.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function executeScan(addressOverride?: string) {
    const target = (addressOverride ?? walletInput).trim();
    if (!target) {
      setError(
        lang === "pt"
          ? "Informe um endereço Solana válido."
          : "Please enter a valid Solana wallet address."
      );
      return;
    }

    stopCurrentAudio();
    setError(null);
    setScanning(true);
    setAnalysis(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: target, cluster }),
      });
      const data = (await res.json()) as ScanResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to scan wallet.");
      }
      setScanData(data);
      await Promise.all([
        runAnalysis(data, lang),
        fetchHistory(data.walletAddress, data.cluster),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  function handleReset() {
    stopCurrentAudio();
    setScanData(null);
    setAnalysis(null);
    setHistoryData(null);
    setError(null);
  }

  async function handleLangChange(nextLang: AppLang) {
    if (nextLang === lang) return;
    stopCurrentAudio();
    setLang(nextLang);
    if (scanData) {
      await runAnalysis(scanData, nextLang);
    }
  }

  async function handlePlayBriefing() {
    if (!analysis?.voiceScript) return;
    if (isPlaying) {
      stopCurrentAudio();
      return;
    }

    setAudioLoading(true);
    setUsedFallbackSpeech(false);

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: analysis.voiceScript,
          lang,
        }),
      });

      if (res.ok) {
        const payload = (await res.json()) as BriefingResponse;
        const audioSrc = `data:${payload.mimeType};base64,${payload.audioBase64}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        await audio.play();
        setIsPlaying(true);
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setUsedFallbackSpeech(true);
        const utter = new SpeechSynthesisUtterance(analysis.voiceScript);
        utter.lang = lang === "pt" ? "pt-BR" : "en-US";
        utter.onend = () => setIsPlaying(false);
        utter.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utter);
        setIsPlaying(true);
      } else {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errJson.error || "Audio playback unavailable.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to play voice briefing."
      );
    } finally {
      setAudioLoading(false);
    }
  }

  const ringRadius = 21;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = scanData
    ? ringCircumference - (scanData.healthScore / 100) * ringCircumference
    : ringCircumference;
  const scoreColor =
    !scanData || scanData.status === "healthy"
      ? "#0d6e4e"
      : scanData.status === "needs_attention"
        ? "#a16207"
        : "#b42318";

  const orderedSnapshots = historyData
    ? [...historyData.snapshots].reverse()
    : [];

  return (
    <div className="app-frame">
      {/* Sticky Minimal Topbar */}
      <div className="topbar-wrap">
        <header className="container topbar">
          <div className="brand">
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-name">SolCheck</span>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-tag">{t.brandTag}</span>
          </div>

          <div className="topbar-actions">
            <div className="lang-switch" role="group" aria-label="Language selector">
              <button
                id="lang-en-btn"
                type="button"
                className={`lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => handleLangChange("en")}
              >
                EN
              </button>
              <button
                id="lang-pt-btn"
                type="button"
                className={`lang-btn ${lang === "pt" ? "active" : ""}`}
                onClick={() => handleLangChange("pt")}
              >
                PT
              </button>
            </div>

            <a
              id="download-apk-link"
              href={apkUrl}
              target="_blank"
              rel="noreferrer"
              className="apk-btn"
            >
              <Smartphone size={14} />
              <span>{t.downloadApk}</span>
              <Download size={13} />
            </a>
          </div>
        </header>
      </div>

      <main className="main-area">
        {!scanData ? (
          /* ==========================================
             LANDING VIEW (Full-Viewport 2-Column Split)
             ========================================== */
          <div className="container landing-grid">
            <section className="landing-left">
              <div className="landing-hero">
                <div className="eyebrow mono">{t.eyebrow}</div>
                <h1>{t.heroTitle}</h1>
                <p className="landing-sub">{t.heroSub}</p>

                <div className="scanner-form">
                  <div className="scanner-bar">
                    <input
                      id="wallet-address-input"
                      type="text"
                      className="wallet-input mono"
                      placeholder={t.placeholder}
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") executeScan();
                      }}
                    />

                    <select
                      id="cluster-select"
                      className="cluster-select mono"
                      value={cluster}
                      onChange={(e) =>
                        setCluster(e.target.value as SolanaCluster)
                      }
                    >
                      <option value="devnet">Devnet</option>
                      <option value="mainnet-beta">Mainnet</option>
                    </select>

                    <button
                      id="scan-wallet-btn"
                      type="button"
                      className="btn-primary"
                      disabled={scanning}
                      onClick={() => executeScan()}
                    >
                      <span>{scanning ? t.scanningBtn : t.scanBtn}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>

                  <div className="scanner-meta">
                    <button
                      id="try-demo-wallet-btn"
                      type="button"
                      className="btn-demo"
                      disabled={scanning}
                      onClick={() => {
                        setWalletInput(demoWallet);
                        executeScan(demoWallet);
                      }}
                    >
                      <Play size={12} />
                      <span>{t.tryDemoBtn}</span>
                      <span className="mono" style={{ color: "var(--ink-muted)" }}>
                        {shortenAddress(demoWallet)}
                      </span>
                    </button>

                    <span className="scanner-hint">{t.clusterHint}</span>
                  </div>
                </div>

                {error && (
                  <div
                    id="scan-error-banner"
                    className="error-banner"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
              </div>

              <div className="spec-strip">
                {t.specs.map((item) => (
                  <div key={item.num} className="spec-item">
                    <span className="spec-num mono">{item.num}</span>
                    <div className="spec-title">{item.title}</div>
                    <p className="spec-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="landing-right">
              <div className="ledger-box">
                <div className="ledger-head">
                  <span className="ledger-head-title mono">{t.ledgerTitle}</span>
                  <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                    SOLANA RPC
                  </span>
                </div>
                <div className="ledger-rows">
                  {t.ledgerRows.map((row) => (
                    <div key={row.key} className="ledger-row">
                      <div>
                        <div className="ledger-key">{row.key}</div>
                        <div className="ledger-sub">{row.sub}</div>
                      </div>
                      <span className="ledger-val mono">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mobile-callout">
                <div className="mobile-callout-title">
                  <Smartphone size={16} />
                  <span>{t.mobileTitle}</span>
                </div>
                <p className="mobile-callout-text">{t.mobileDesc}</p>
                <a
                  href={apkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mobile-callout-link"
                >
                  <span>{t.mobileCta}</span>
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </aside>
          </div>
        ) : (
          /* ==========================================
             ACTIVE WORKSPACE VIEW (Full-Width Ledger)
             ========================================== */
          <div aria-live="polite">
            {/* Compact Persistent Command Strip */}
            <div className="command-strip-wrap">
              <div className="container command-strip">
                <div className="scanner-bar">
                  <input
                    id="wallet-address-input"
                    type="text"
                    className="wallet-input mono"
                    placeholder={t.placeholder}
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") executeScan();
                    }}
                  />

                  <select
                    id="cluster-select"
                    className="cluster-select mono"
                    value={cluster}
                    onChange={(e) => setCluster(e.target.value as SolanaCluster)}
                  >
                    <option value="devnet">Devnet</option>
                    <option value="mainnet-beta">Mainnet</option>
                  </select>

                  <button
                    id="scan-wallet-btn"
                    type="button"
                    className="btn-primary"
                    disabled={scanning}
                    onClick={() => executeScan()}
                  >
                    <span>{scanning ? t.scanningBtn : t.scanBtn}</span>
                  </button>
                </div>

                <button
                  id="try-demo-wallet-btn"
                  type="button"
                  className="btn-ghost"
                  disabled={scanning}
                  onClick={() => {
                    setWalletInput(demoWallet);
                    executeScan(demoWallet);
                  }}
                >
                  {t.tryDemoBtn}
                </button>

                <a
                  href={`https://explorer.solana.com/address/${scanData.walletAddress}${
                    scanData.cluster === "devnet" ? "?cluster=devnet" : ""
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost mono"
                >
                  <span>{shortenAddress(scanData.walletAddress)}</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleReset}
                >
                  <RotateCcw size={13} />
                  <span>{t.newScan}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="container">
                <div
                  id="scan-error-banner"
                  className="error-banner"
                  role="alert"
                >
                  {error}
                </div>
              </div>
            )}

            {/* Full-Width 5-Column KPI Strip */}
            <div className="kpi-strip-wrap">
              <div className="container kpi-strip">
                <div className="kpi-cell">
                  <div className="score-inline">
                    <div className="score-ring-box">
                      <svg width="52" height="52" viewBox="0 0 52 52">
                        <circle
                          cx="26"
                          cy="26"
                          r={ringRadius}
                          fill="none"
                          stroke="#e6e3da"
                          strokeWidth="4.5"
                        />
                        <circle
                          cx="26"
                          cy="26"
                          r={ringRadius}
                          fill="none"
                          stroke={scoreColor}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          transform="rotate(-90 26 26)"
                          style={{ transition: "stroke-dashoffset 0.45s ease" }}
                        />
                      </svg>
                      <span
                        className="score-ring-num mono"
                        style={{ color: scoreColor }}
                      >
                        {scanData.healthScore}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className="kpi-label">{t.healthScore}</span>
                      <span className={`status-tag status-${scanData.status}`}>
                        {t[scanData.status]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-cell">
                  <span className="kpi-label">{t.solBalance}</span>
                  <span className="kpi-value mono">
                    {scanData.solBalance.toFixed(4)} SOL
                  </span>
                  <span className="kpi-sub mono">
                    {scanData.cluster.toUpperCase()}
                  </span>
                </div>

                <div className="kpi-cell">
                  <span className="kpi-label">{t.reclaimableRent}</span>
                  <span
                    className={`kpi-value mono ${
                      scanData.totalReclaimableSol > 0 ? "accent" : ""
                    }`}
                  >
                    +{scanData.totalReclaimableSol.toFixed(4)} SOL
                  </span>
                  <span className="kpi-sub mono">
                    {scanData.emptyAccounts.length} ATAs
                  </span>
                </div>

                <div className="kpi-cell">
                  <span className="kpi-label">{t.emptyAtas}</span>
                  <span className="kpi-value mono">
                    {scanData.emptyAccounts.length}
                  </span>
                  <span className="kpi-sub">SPL / Token-2022</span>
                </div>

                <div className="kpi-cell">
                  <span className="kpi-label">{t.activeTokens}</span>
                  <span className="kpi-value mono">
                    {scanData.activeTokenAccountsCount}
                  </span>
                  <span className="kpi-sub mono">
                    {scanData.delegatedAccountsCount} {t.delegations}
                  </span>
                </div>
              </div>
            </div>

            {/* Asymmetric 2-Column Main Workspace */}
            <div className="container workspace-grid">
              {/* Primary Left Column: Advisor, Audio Briefing, Insights, Empty ATAs Table */}
              <div className="workspace-primary">
                <section className="section-block">
                  <div className="section-head">
                    <span className="section-title">{t.advisorTitle}</span>
                    <button
                      id="refresh-firecrawl-btn"
                      type="button"
                      className="btn-ghost"
                      disabled={analyzing}
                      onClick={() =>
                        runAnalysis(scanData, lang, {
                          forceRefreshFirecrawl: true,
                        })
                      }
                      style={{ padding: "5px 10px", fontSize: "0.76rem" }}
                    >
                      <RefreshCw size={12} />
                      <span>{t.refreshLive}</span>
                    </button>
                  </div>

                  {analyzing && !analysis ? (
                    <p className="muted-note">{t.analyzing}</p>
                  ) : analysis ? (
                    <>
                      <h1 className="advisor-headline">{analysis.headline}</h1>

                      <div className="voice-card">
                        <div className="voice-controls">
                          <button
                            id="play-voice-briefing-btn"
                            type="button"
                            className="voice-btn"
                            disabled={audioLoading}
                            onClick={handlePlayBriefing}
                          >
                            {isPlaying ? (
                              <Square size={14} />
                            ) : (
                              <Volume2 size={15} />
                            )}
                            <span>
                              {audioLoading
                                ? t.loadingAudio
                                : isPlaying
                                  ? t.stopBriefing
                                  : t.playBriefing}
                            </span>
                          </button>

                          <span className="voice-meta mono">
                            ElevenLabs Multilingual v2
                          </span>
                        </div>

                        <p className="voice-script">“{analysis.voiceScript}”</p>

                        {usedFallbackSpeech && (
                          <span
                            style={{ fontSize: "0.75rem", color: "var(--amber)" }}
                          >
                            {t.browserTtsNote}
                          </span>
                        )}
                      </div>

                      <div className="insights-list">
                        {analysis.insights.map((ins, idx) => (
                          <div key={idx} className="insight-item">
                            <div className="insight-head">
                              <span className={`sev-tag sev-${ins.severity}`}>
                                {ins.severity}
                              </span>
                              <span className="insight-title">{ins.title}</span>
                            </div>
                            <p className="insight-detail">{ins.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="question-row">
                        {t.quickQuestions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className="question-btn"
                            disabled={analyzing}
                            onClick={() =>
                              runAnalysis(scanData, lang, { userQuestion: q })
                            }
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      {analysis.sources.length > 0 && (
                        <div className="sources-row">
                          <span className="section-title" style={{ marginRight: 4 }}>
                            {t.liveSources}:
                          </span>
                          {analysis.sources.map((src) => (
                            <a
                              key={src.slug}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="source-link"
                            >
                              <span>{src.name}</span>
                              <ExternalLink size={11} />
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </section>

                {scanData.emptyAccounts.length > 0 && (
                  <section className="section-block">
                    <div className="section-head">
                      <span className="section-title">{t.emptyTableTitle}</span>
                      <span
                        className="mono"
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--accent)",
                        }}
                      >
                        {scanData.emptyAccounts.length} ATAs · +
                        {scanData.totalReclaimableSol.toFixed(6)} SOL
                      </span>
                    </div>

                    <div className="table-wrap">
                      <table className="ata-table">
                        <thead>
                          <tr>
                            <th>ATA Account</th>
                            <th>Token Mint</th>
                            <th>Program</th>
                            <th>Refundable Rent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanData.emptyAccounts.map((acc) => (
                            <tr key={acc.pubkey}>
                              <td className="mono">
                                {shortenAddress(acc.pubkey)}
                              </td>
                              <td className="mono">
                                {shortenAddress(acc.mint)}
                              </td>
                              <td className="mono">
                                {acc.programId.startsWith("Tokenz")
                                  ? "Token-2022"
                                  : "SPL Token"}
                              </td>
                              <td
                                className="mono"
                                style={{
                                  color: "var(--accent)",
                                  fontWeight: 600,
                                }}
                              >
                                +{(acc.reclaimableLamports / 1e9).toFixed(6)} SOL
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Rent Callout + Risk Flags + Anchor Vault + History */}
              <aside className="workspace-aside">
                <section className="section-block">
                  <div className="section-head">
                    <span className="section-title">{t.reclaimSection}</span>
                  </div>

                  <div
                    className={`reclaim-strip ${
                      scanData.emptyAccounts.length === 0 ? "clean" : ""
                    }`}
                  >
                    <strong>
                      {scanData.emptyAccounts.length > 0
                        ? `${scanData.totalReclaimableSol.toFixed(5)} ${t.lockedFound} (${
                            scanData.emptyAccounts.length
                          })`
                        : t.cleanWallet}
                    </strong>
                    <p>{t.mobileActionNote}</p>
                  </div>

                  {scanData.riskFlags.length > 0 && (
                    <div className="flags-list">
                      {scanData.riskFlags.map((flag, i) => (
                        <span key={i} className="flag-chip">
                          <span className={`sev-tag sev-${flag.severity}`}>
                            {flag.code.replace(/_/g, " ")}
                          </span>
                          <span
                            className="mono"
                            style={{ color: "var(--ink-secondary)" }}
                          >
                            {flag.value}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="section-block">
                  <div className="section-head">
                    <span className="section-title">
                      <Vault size={13} />
                      {t.vaultTitle}
                    </span>
                    <a
                      href={`https://explorer.solana.com/address/${scanData.vault.pda}${
                        scanData.cluster === "devnet" ? "?cluster=devnet" : ""
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="source-link mono"
                    >
                      PDA {shortenAddress(scanData.vault.pda)}
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <div className="vault-card">
                    {scanData.vault.initialized ? (
                      <>
                        <div className="vault-top">
                          <strong style={{ fontSize: "0.94rem" }}>
                            {scanData.vault.goalName}
                          </strong>
                          <span
                            className="mono"
                            style={{
                              fontSize: "0.86rem",
                              fontWeight: 600,
                              color: "var(--accent)",
                            }}
                          >
                            {scanData.vault.progressPercent}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${scanData.vault.progressPercent}%`,
                            }}
                          />
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--ink-secondary)",
                          }}
                        >
                          {(scanData.vault.currentLamports / 1e9).toFixed(4)} /{" "}
                          {(scanData.vault.targetLamports / 1e9).toFixed(4)} SOL
                        </div>
                      </>
                    ) : (
                      <p className="muted-note">{t.vaultUninitialized}</p>
                    )}
                  </div>
                </section>

                {historyData && (
                  <section className="section-block">
                    <div className="section-head">
                      <span className="section-title">
                        <Clock size={13} />
                        {t.historyTitle}
                      </span>
                    </div>

                    <div className="history-grid">
                      <div className="history-stat">
                        <div className="history-stat-label">
                          {t.totalReclaimed}
                        </div>
                        <div
                          className="history-stat-val mono"
                          style={{ color: "var(--accent)" }}
                        >
                          +{historyData.totalSolReclaimed.toFixed(4)}
                        </div>
                      </div>
                      <div className="history-stat">
                        <div className="history-stat-label">
                          {t.accountsClosed}
                        </div>
                        <div className="history-stat-val mono">
                          {historyData.totalAccountsClosed}
                        </div>
                      </div>
                      <div className="history-stat">
                        <div className="history-stat-label">{t.scansRun}</div>
                        <div className="history-stat-val mono">
                          {historyData.scansCount}
                        </div>
                      </div>
                    </div>

                    {orderedSnapshots.length > 0 && (
                      <div className="score-bars">
                        {orderedSnapshots.map((snap) => {
                          const barColor =
                            snap.healthScore >= 80
                              ? "#0d6e4e"
                              : snap.healthScore >= 50
                                ? "#a16207"
                                : "#b42318";
                          return (
                            <div key={snap.id} className="score-bar-col">
                              <span
                                className="mono"
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  color: barColor,
                                }}
                              >
                                {snap.healthScore}
                              </span>
                              <div className="score-bar-track">
                                <div
                                  className="score-bar-fill"
                                  style={{
                                    height: `${Math.max(8, snap.healthScore)}%`,
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {historyData.events.length > 0 ? (
                      <div className="sources-row" style={{ paddingTop: 0 }}>
                        {historyData.events.map((ev) => (
                          <a
                            key={ev.id}
                            href={ev.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="source-link mono"
                          >
                            <span>
                              {ev.actionType.replace(/_/g, " ").toUpperCase()} ·{" "}
                              {ev.solAmount.toFixed(4)} SOL
                            </span>
                            <ExternalLink size={11} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="muted-note">{t.noEventsYet}</span>
                    )}
                  </section>
                )}
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
