import { useRouter } from "expo-router";
import {
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Wallet,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HealthGauge } from "../src/components/HealthGauge";
import { useSolCheck } from "../src/context/AppContext";
import { COLORS } from "../src/theme";

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function XRayScreen() {
  const router = useRouter();
  const {
    lang,
    t,
    setLang,
    walletAddress,
    connecting,
    connect,
    scanData,
    isScanning,
    refreshScan,
    analysis,
    isPlayingAudio,
    isLoadingAudio,
    toggleVoiceBriefing,
    lastError,
  } = useSolCheck();

  // Disconnected State
  if (!walletAddress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.disconnectedContainer}>
          <View style={styles.topLangRow}>
            <View />
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
                onPress={() => setLang("en")}
              >
                <Text
                  style={[
                    styles.langText,
                    lang === "en" && styles.langTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, lang === "pt" && styles.langBtnActive]}
                onPress={() => setLang("pt")}
              >
                <Text
                  style={[
                    styles.langText,
                    lang === "pt" && styles.langTextActive,
                  ]}
                >
                  PT
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <View style={styles.logoCircle}>
              <ShieldCheck size={36} color={COLORS.solanaGreen} />
            </View>
            <Text style={styles.brandTitle}>{t.appName}</Text>
            <Text style={styles.brandSubtitle}>{t.appSubtitle}</Text>

            <TouchableOpacity
              style={styles.connectBtn}
              disabled={connecting}
              onPress={connect}
              activeOpacity={0.85}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#06130D" />
              ) : (
                <Wallet size={20} color="#06130D" />
              )}
              <Text style={styles.connectBtnText}>
                {connecting ? t.connectingBtn : t.connectBtn}
              </Text>
            </TouchableOpacity>

            {lastError ? (
              <Text style={styles.errorText}>{lastError}</Text>
            ) : null}
          </View>

          <View style={styles.footerBadge}>
            <Text style={styles.footerBadgeText}>● {t.devnetBadge}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Connected State
  const emptyCount = scanData?.emptyAccounts.length ?? 0;
  const reclaimSol = scanData?.totalReclaimableSol ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.walletPill}>
            <View style={styles.greenDot} />
            <Text style={styles.walletPillText}>{shortAddr(walletAddress)}</Text>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
                onPress={() => setLang("en")}
              >
                <Text
                  style={[
                    styles.langText,
                    lang === "en" && styles.langTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, lang === "pt" && styles.langBtnActive]}
                onPress={() => setLang("pt")}
              >
                <Text
                  style={[
                    styles.langText,
                    lang === "pt" && styles.langTextActive,
                  ]}
                >
                  PT
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.iconBtn}
              disabled={isScanning}
              onPress={() => refreshScan()}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={COLORS.solanaGreen} />
              ) : (
                <RefreshCw size={17} color={COLORS.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

        {!scanData && isScanning ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.solanaGreen} />
            <Text style={styles.loadingLabel}>{t.xray.scanning}</Text>
          </View>
        ) : scanData ? (
          <>
            {/* Health Score Gauge */}
            <HealthGauge
              score={scanData.healthScore}
              status={scanData.status}
              statusLabel={t.status[scanData.status]}
              solBalance={scanData.solBalance}
              solBalanceLabel={t.xray.solBalance}
            />

            {/* Locked Rent Highlight Card */}
            <View
              style={[
                styles.reclaimCard,
                emptyCount === 0 && styles.reclaimCardClean,
              ]}
            >
              <Text style={styles.reclaimTitle}>
                {emptyCount > 0 ? t.xray.lockedTitle : t.xray.cleanTitle}
              </Text>
              <Text style={styles.reclaimDesc}>
                {emptyCount > 0
                  ? t.xray.lockedDesc
                      .replace("{sol}", reclaimSol.toFixed(4))
                      .replace("{count}", String(emptyCount))
                  : t.xray.cleanDesc}
              </Text>

              {emptyCount > 0 && (
                <TouchableOpacity
                  style={styles.reclaimCta}
                  onPress={() => router.push("/vault")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reclaimCtaText}>{t.xray.reclaimCta}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Anchor Vault Summary Card */}
            <View style={styles.vaultSummaryCard}>
              <View style={styles.vaultSummaryRow}>
                <Text style={styles.vaultSummaryTitle}>
                  {t.xray.vaultSummaryTitle}
                </Text>
                {scanData.vault.initialized && (
                  <Text style={styles.vaultSummaryPct}>
                    {scanData.vault.progressPercent}%
                  </Text>
                )}
              </View>

              {scanData.vault.initialized ? (
                <>
                  <Text style={styles.vaultGoalName}>
                    {scanData.vault.goalName} ·{" "}
                    {(scanData.vault.currentLamports / 1e9).toFixed(4)} /{" "}
                    {(scanData.vault.targetLamports / 1e9).toFixed(2)} SOL
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            100,
                            scanData.vault.progressPercent
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push("/vault")}>
                  <Text style={styles.createGoalLink}>
                    {t.xray.createGoalCta}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Mini Voice Briefing Player */}
            <TouchableOpacity
              style={[
                styles.miniVoiceBar,
                (!analysis?.voiceScript || isLoadingAudio) && { opacity: 0.65 },
              ]}
              disabled={!analysis?.voiceScript || isLoadingAudio}
              onPress={toggleVoiceBriefing}
              activeOpacity={0.85}
            >
              {isLoadingAudio ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : isPlayingAudio ? (
                <Square size={16} color="#FFFFFF" />
              ) : (
                <Play size={16} color="#FFFFFF" />
              )}
              <Text style={styles.miniVoiceText}>
                {isPlayingAudio
                  ? t.xray.stopBriefingMini
                  : t.xray.playBriefingMini}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  disconnectedContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  topLangRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCenter: {
    alignItems: "center",
    gap: 14,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.solanaGreenDim,
    borderWidth: 1,
    borderColor: "rgba(20, 241, 149, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  connectBtn: {
    width: "100%",
    backgroundColor: COLORS.solanaGreen,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  connectBtnText: {
    color: "#06130D",
    fontSize: 15,
    fontWeight: "800",
  },
  footerBadge: {
    alignItems: "center",
    paddingBottom: 8,
  },
  footerBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.solanaGreen,
  },
  walletPillText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: COLORS.bgPrimary,
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  langTextActive: {
    color: COLORS.solanaGreen,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  loadingLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  reclaimCard: {
    backgroundColor: "rgba(20, 241, 149, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 241, 149, 0.35)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  reclaimCardClean: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.borderSubtle,
  },
  reclaimTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  reclaimDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  reclaimCta: {
    marginTop: 6,
    backgroundColor: COLORS.solanaGreen,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  reclaimCtaText: {
    color: "#06130D",
    fontWeight: "800",
    fontSize: 14,
  },
  vaultSummaryCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  vaultSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vaultSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  vaultSummaryPct: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.solanaGreen,
    fontVariant: ["tabular-nums"],
  },
  vaultGoalName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.solanaGreen,
  },
  createGoalLink: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.solanaGreen,
  },
  miniVoiceBar: {
    backgroundColor: COLORS.solanaPurple,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  miniVoiceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: COLORS.redDim,
    padding: 10,
    borderRadius: 8,
  },
});
