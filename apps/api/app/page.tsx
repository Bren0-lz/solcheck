"use client";

import React, { useRef, useState } from "react";
import {
  Activity,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Vault,
  Volume2,
  Square,
} from "lucide-react";
import type {
  AnalyzeResponse,
  AppLang,
  BriefingResponse,
  ScanResponse,
  SolanaCluster,
} from "@/lib/types";

// Valid Solana Devnet address fallback if NEXT_PUBLIC_DEMO_WALLET is not yet set
const FALLBACK_DEMO_WALLET = "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg";

const COPY = {
  en: {
    subtitle: "AI Wallet Advisor, Rent Reclaim & Savings Vault on Solana Mobile",
    downloadApk: "Download Android APK",
    heroTitle: "Instant X-Ray & AI Voice Advisor for Your Solana Wallet",
    heroSub:
      "Detect refundable SOL locked inside empty SPL token accounts, verify protocol insights with live Firecrawl data, listen to a 30-second ElevenLabs briefing, and route reclaimed rent into a non-custodial Anchor vault on Android.",
    placeholder: "Enter any Solana wallet address (Base58)...",
    scanBtn: "Run Wallet X-Ray",
    scanningBtn: "Scanning RPC...",
    tryDemoBtn: "Try Demo Wallet",
    clusterHint: "100% Non-Custodial · Public on-chain read · Sign on Solana Mobile (MWA)",
    healthTitle: "On-Chain Wallet X-Ray",
    solBalance: "SOL Balance",
    activeTokens: "Active SPL Tokens",
    emptyAtas: "Empty SPL Accounts",
    reclaimableRent: "Reclaimable Rent",
    healthy: "Healthy",
    needs_attention: "Needs Attention",
    leaking_value: "Leaking Value",
    lockedFound: "SOL locked across empty SPL token accounts",
    cleanWallet: "Zero empty SPL token accounts locking rent.",
    mobileActionNote:
      "Install the SolCheck Android APK (Phantom / Solana Seeker MWA) to close empty accounts and route SOL into your Anchor vault in 1 atomic signature.",
    advisorTitle: "AI Financial Advisor",
    analyzing: "Fetching live Firecrawl sources & running AI analysis...",
    playBriefing: "Play 30s AI Briefing",
    stopBriefing: "Stop Audio",
    loadingAudio: "Generating Voice...",
    browserTtsNote:
      "Playing via browser speech fallback (configure ELEVENLABS_API_KEY on server for ElevenLabs Multilingual v2 MP3).",
    quickQuestions: [
      "How does Solana rent work?",
      "Is my wallet safe?",
      "How much emergency SOL should I save?",
    ],
    liveSources: "Live Ecosystem Sources (Firecrawl)",
    refreshLive: "Refresh Live Data",
    vaultTitle: "Anchor Savings Goal Vault (PDA)",
    vaultUninitialized: "Not initialized yet for this wallet",
    emptyTableTitle: "Closable Zero-Balance SPL Accounts",
  },
  pt: {
    subtitle: "Consultor de IA, Resgate de Rent & Cofre de Metas no Solana Mobile",
    downloadApk: "Baixar APK Android",
    heroTitle: "Raio-X Instantâneo e Consultor por Voz para sua Carteira Solana",
    heroSub:
      "Encontre SOL reembolsável preso em contas SPL vazias, valide recomendações com dados ao vivo via Firecrawl, ouça um briefing de 30 segundos no ElevenLabs e envie o valor recuperado para um cofre Anchor não-custodial no Android.",
    placeholder: "Digite um endereço de carteira Solana (Base58)...",
    scanBtn: "Executar Raio-X",
    scanningBtn: "Lendo Blockchain...",
    tryDemoBtn: "Testar Carteira Demo",
    clusterHint: "100% Não-Custodial · Leitura pública on-chain · Assinatura via Solana Mobile (MWA)",
    healthTitle: "Raio-X On-Chain da Carteira",
    solBalance: "Saldo em SOL",
    activeTokens: "Tokens SPL Ativos",
    emptyAtas: "Contas SPL Vazias",
    reclaimableRent: "SOL Recuperável",
    healthy: "Saudável",
    needs_attention: "Atenção",
    leaking_value: "Perdendo Valor",
    lockedFound: "SOL preso em contas de tokens SPL vazias",
    cleanWallet: "Zero contas SPL vazias prendendo rent.",
    mobileActionNote:
      "Instale o APK Android do SolCheck (Phantom / Solana Seeker MWA) para fechar contas vazias e guardar no Cofre Anchor em 1 única assinatura atômica.",
    advisorTitle: "Consultor Financeiro de IA",
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
    liveSources: "Fontes ao Vivo do Ecossistema (Firecrawl)",
    refreshLive: "Atualizar Dados ao Vivo",
    vaultTitle: "Cofre de Metas On-Chain (Anchor PDA)",
    vaultUninitialized: "Ainda não inicializado para esta carteira",
    emptyTableTitle: "Contas SPL Vazias Prontas para Resgate",
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
      await runAnalysis(data, lang);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
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

      // Fallback to browser SpeechSynthesis only if ELEVENLABS_API_KEY is unconfigured in dev
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

  const gaugeRadius = 54;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = scanData
    ? gaugeCircumference - (scanData.healthScore / 100) * gaugeCircumference
    : gaugeCircumference;
  const gaugeColor =
    !scanData || scanData.status === "healthy"
      ? "#14F195"
      : scanData.status === "needs_attention"
        ? "#F59E0B"
        : "#EF4444";

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-name">SolCheck</div>
            <div className="brand-tag">{t.subtitle}</div>
          </div>
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
            <Smartphone size={16} />
            <span>{t.downloadApk}</span>
            <Download size={14} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <h1>{t.heroTitle}</h1>
          <p className="hero-sub">{t.heroSub}</p>

          <div className="scanner-bar">
            <div className="scanner-inputs">
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
                className="cluster-select"
                value={cluster}
                onChange={(e) => setCluster(e.target.value as SolanaCluster)}
              >
                <option value="devnet">Solana Devnet</option>
                <option value="mainnet-beta">Mainnet-Beta</option>
              </select>

              <button
                id="scan-wallet-btn"
                type="button"
                className="btn-primary"
                disabled={scanning}
                onClick={() => executeScan()}
              >
                <Activity size={17} />
                <span>{scanning ? t.scanningBtn : t.scanBtn}</span>
              </button>

              <button
                id="try-demo-wallet-btn"
                type="button"
                className="btn-secondary"
                disabled={scanning}
                onClick={() => {
                  setWalletInput(demoWallet);
                  executeScan(demoWallet);
                }}
              >
                <Sparkles size={15} />
                <span>{t.tryDemoBtn}</span>
              </button>
            </div>

            <div className="scanner-footer">
              <span>{t.clusterHint}</span>
              <span className="mono">
                Demo: {shortenAddress(demoWallet)}
              </span>
            </div>
          </div>

          {error && (
            <div id="scan-error-banner" className="error-banner" role="alert">
              {error}
            </div>
          )}
        </section>

        {scanData && (
          <section className="results-grid" aria-live="polite">
            {/* Left Column: Health Score + Metrics + Vault */}
            <div className="col-5" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <Activity size={16} />
                    {t.healthTitle}
                  </span>
                  <a
                    href={`https://explorer.solana.com/address/${scanData.walletAddress}${
                      scanData.cluster === "devnet" ? "?cluster=devnet" : ""
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link mono"
                  >
                    {shortenAddress(scanData.walletAddress)}
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="gauge-wrap">
                  <div className="gauge-svg-box">
                    <svg width="132" height="132" viewBox="0 0 132 132">
                      <circle
                        cx="66"
                        cy="66"
                        r={gaugeRadius}
                        fill="none"
                        stroke="#23293D"
                        strokeWidth="10"
                      />
                      <circle
                        cx="66"
                        cy="66"
                        r={gaugeRadius}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={gaugeOffset}
                        transform="rotate(-90 66 66)"
                        style={{ transition: "stroke-dashoffset 0.5s ease" }}
                      />
                    </svg>
                    <div className="gauge-center">
                      <span className="gauge-score mono" style={{ color: gaugeColor }}>
                        {scanData.healthScore}
                      </span>
                      <span className="gauge-max mono">/ 100</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className={`status-badge status-${scanData.status}`}>
                      ● {t[scanData.status]}
                    </span>
                    <div className="mono" style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                      {scanData.solBalance.toFixed(4)} SOL
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {scanData.cluster.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="metric-list">
                  <div className="metric-item">
                    <div className="metric-label">{t.emptyAtas}</div>
                    <div className="metric-value mono">{scanData.emptyAccounts.length}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">{t.reclaimableRent}</div>
                    <div
                      className="metric-value mono"
                      style={{
                        color:
                          scanData.totalReclaimableSol > 0
                            ? "var(--sol-green)"
                            : "var(--text-primary)",
                      }}
                    >
                      +{scanData.totalReclaimableSol.toFixed(4)} SOL
                    </div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">{t.activeTokens}</div>
                    <div className="metric-value mono">{scanData.activeTokenAccountsCount}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Delegations</div>
                    <div className="metric-value mono">{scanData.delegatedAccountsCount}</div>
                  </div>
                </div>

                <div
                  className={`reclaim-callout ${
                    scanData.emptyAccounts.length === 0 ? "reclaim-callout-clean" : ""
                  }`}
                >
                  <strong style={{ fontSize: "0.92rem" }}>
                    {scanData.emptyAccounts.length > 0
                      ? `${scanData.totalReclaimableSol.toFixed(5)} ${t.lockedFound} (${
                          scanData.emptyAccounts.length
                        })`
                      : t.cleanWallet}
                  </strong>
                  <span style={{ fontSize: "0.81rem", color: "var(--text-secondary)" }}>
                    {t.mobileActionNote}
                  </span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <Vault size={16} />
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
                    <ExternalLink size={12} />
                  </a>
                </div>

                {scanData.vault.initialized ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{scanData.vault.goalName}</strong>
                      <span className="mono" style={{ color: "var(--sol-green)" }}>
                        {scanData.vault.progressPercent}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${scanData.vault.progressPercent}%` }}
                      />
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
                    >
                      {(scanData.vault.currentLamports / 1e9).toFixed(4)} /{" "}
                      {(scanData.vault.targetLamports / 1e9).toFixed(4)} SOL
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>
                    {t.vaultUninitialized}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: AI Advisor + ElevenLabs Audio + Firecrawl Sources */}
            <div className="col-7">
              <div className="panel" style={{ height: "100%" }}>
                <div className="panel-header">
                  <span className="panel-title">
                    <Sparkles size={16} />
                    {t.advisorTitle}
                  </span>
                  <button
                    id="refresh-firecrawl-btn"
                    type="button"
                    className="btn-secondary"
                    disabled={analyzing}
                    onClick={() =>
                      runAnalysis(scanData, lang, { forceRefreshFirecrawl: true })
                    }
                    style={{ padding: "6px 11px", fontSize: "0.78rem" }}
                  >
                    <RefreshCw size={13} />
                    <span>{t.refreshLive}</span>
                  </button>
                </div>

                {analyzing && !analysis ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
                    {t.analyzing}
                  </p>
                ) : analysis ? (
                  <>
                    <h2 style={{ fontSize: "1.18rem", fontWeight: 600 }}>
                      {analysis.headline}
                    </h2>

                    {/* ElevenLabs Voice Briefing Box */}
                    <div className="voice-box">
                      <div className="voice-top">
                        <button
                          id="play-voice-briefing-btn"
                          type="button"
                          className="voice-btn"
                          disabled={audioLoading}
                          onClick={handlePlayBriefing}
                        >
                          {isPlaying ? <Square size={15} /> : <Volume2 size={16} />}
                          <span>
                            {audioLoading
                              ? t.loadingAudio
                              : isPlaying
                                ? t.stopBriefing
                                : t.playBriefing}
                          </span>
                        </button>
                        <span className="sponsor-tag">
                          Powered by ElevenLabs Multilingual v2
                        </span>
                      </div>

                      <p className="voice-script">“{analysis.voiceScript}”</p>
                      {usedFallbackSpeech && (
                        <span style={{ fontSize: "0.75rem", color: "var(--amber)" }}>
                          {t.browserTtsNote}
                        </span>
                      )}
                    </div>

                    {/* Prioritized Insights */}
                    <div className="insights-stack">
                      {analysis.insights.map((ins, idx) => (
                        <div key={idx} className="insight-row">
                          <div className="insight-head">
                            <span className={`sev-pill sev-${ins.severity}`}>
                              {ins.severity}
                            </span>
                            <strong style={{ fontSize: "0.92rem" }}>{ins.title}</strong>
                          </div>
                          <p
                            style={{
                              fontSize: "0.86rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {ins.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Quick Follow-Up Questions */}
                    <div className="chip-row">
                      {t.quickQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="question-chip"
                          disabled={analyzing}
                          onClick={() =>
                            runAnalysis(scanData, lang, { userQuestion: q })
                          }
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    {/* Live Firecrawl Sources */}
                    <div className="sources-bar">
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                        }}
                      >
                        {t.liveSources}
                      </span>
                      <div className="source-links">
                        {analysis.sources.map((src) => (
                          <a
                            key={src.slug}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="source-link"
                          >
                            <span>{src.name}</span>
                            <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Full-width Empty SPL Accounts Table if detected */}
            {scanData.emptyAccounts.length > 0 && (
              <div className="col-12">
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">{t.emptyTableTitle}</span>
                    <span className="mono" style={{ fontSize: "0.82rem", color: "var(--sol-green)" }}>
                      {scanData.emptyAccounts.length} ATAs · +
                      {scanData.totalReclaimableSol.toFixed(6)} SOL
                    </span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
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
                            <td className="mono">{shortenAddress(acc.pubkey)}</td>
                            <td className="mono">{shortenAddress(acc.mint)}</td>
                            <td className="mono">
                              {acc.programId.startsWith("Tokenz")
                                ? "Token-2022"
                                : "SPL Token"}
                            </td>
                            <td className="mono" style={{ color: "var(--sol-green)" }}>
                              +{(acc.reclaimableLamports / 1e9).toFixed(6)} SOL
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
