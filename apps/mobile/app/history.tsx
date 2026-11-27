import * as Linking from "expo-linking";
import { ExternalLink, LogOut, RefreshCw } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSolCheck } from "../src/context/AppContext";
import { COLORS } from "../src/theme";

export default function HistoryScreen() {
  const {
    lang,
    t,
    setLang,
    walletAddress,
    disconnect,
    history,
    isLoadingHistory,
    refreshHistory,
  } = useSolCheck();

  useEffect(() => {
    if (walletAddress) {
      void refreshHistory();
    }
  }, [walletAddress, refreshHistory]);

  if (!walletAddress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyPrompt}>{t.common.connectPrompt}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderedSnapshots = history ? [...history.snapshots].reverse() : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t.history.title}</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            disabled={isLoadingHistory}
            onPress={() => refreshHistory()}
          >
            {isLoadingHistory ? (
              <ActivityIndicator size="small" color={COLORS.solanaGreen} />
            ) : (
              <RefreshCw size={16} color={COLORS.textPrimary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Cumulative KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.history.totalReclaimed}</Text>
            <Text style={[styles.kpiValue, { color: COLORS.solanaGreen }]}>
              +{(history?.totalSolReclaimed ?? 0).toFixed(4)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.history.accountsClosed}</Text>
            <Text style={styles.kpiValue}>
              {history?.totalAccountsClosed ?? 0}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.history.scansRun}</Text>
            <Text style={styles.kpiValue}>{history?.scansCount ?? 0}</Text>
          </View>
        </View>

        {/* Health Score Evolution Bar Chart */}
        {orderedSnapshots.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.history.scoreEvolution}</Text>
            <View style={styles.chartRow}>
              {orderedSnapshots.map((snap) => {
                const color =
                  snap.healthScore >= 80
                    ? COLORS.solanaGreen
                    : snap.healthScore >= 50
                      ? COLORS.amber
                      : COLORS.red;
                return (
                  <View key={snap.id} style={styles.barCol}>
                    <Text style={[styles.barScore, { color }]}>
                      {snap.healthScore}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(8, snap.healthScore)}%`,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Verifiable On-Chain Transactions Log */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.history.txLogTitle}</Text>
          {!history || history.events.length === 0 ? (
            <Text style={styles.emptyNote}>{t.history.noEvents}</Text>
          ) : (
            <View style={styles.eventsStack}>
              {history.events.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.eventItem}
                  onPress={() => Linking.openURL(ev.explorerUrl)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventAction}>
                      {ev.actionType.replace(/_/g, " ").toUpperCase()} ·{" "}
                      {ev.solAmount.toFixed(4)} SOL
                    </Text>
                    <Text style={styles.eventMeta}>
                      {new Date(ev.createdAt).toLocaleString()} ·{" "}
                      {ev.txSignature.slice(0, 8)}...
                    </Text>
                  </View>
                  <ExternalLink size={15} color={COLORS.solanaGreen} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quick Settings: Language & Disconnect */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.history.languageLabel}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langChoice,
                lang === "en" && styles.langChoiceActive,
              ]}
              onPress={() => setLang("en")}
            >
              <Text
                style={[
                  styles.langChoiceText,
                  lang === "en" && styles.langChoiceTextActive,
                ]}
              >
                English (EN)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langChoice,
                lang === "pt" && styles.langChoiceActive,
              ]}
              onPress={() => setLang("pt")}
            >
              <Text
                style={[
                  styles.langChoiceText,
                  lang === "pt" && styles.langChoiceTextActive,
                ]}
              >
                Português (PT-BR)
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
            <LogOut size={16} color={COLORS.red} />
            <Text style={styles.disconnectText}>{t.disconnectBtn}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyPrompt: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    height: 110,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    height: "100%",
  },
  barScore: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 26,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
  },
  emptyNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  eventsStack: {
    gap: 8,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 12,
  },
  eventAction: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  eventMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  langRow: {
    flexDirection: "row",
    gap: 10,
  },
  langChoice: {
    flex: 1,
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  langChoiceActive: {
    borderColor: COLORS.solanaGreen,
    backgroundColor: COLORS.solanaGreenDim,
  },
  langChoiceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  langChoiceTextActive: {
    color: COLORS.solanaGreen,
  },
  disconnectBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.redDim,
  },
  disconnectText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: "700",
  },
});
