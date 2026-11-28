import * as Linking from "expo-linking";
import { ExternalLink, RefreshCw } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VoicePlayer } from "../src/components/VoicePlayer";
import { useSolCheck } from "../src/context/AppContext";
import { COLORS } from "../src/theme";

export default function AdvisorScreen() {
  const {
    t,
    walletAddress,
    scanData,
    analysis,
    isAnalyzing,
    refreshAnalysis,
    isPlayingAudio,
    isLoadingAudio,
    voiceMode,
    toggleVoiceBriefing,
  } = useSolCheck();

  if (!walletAddress || !scanData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyPrompt}>{t.common.connectPrompt}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isAnalyzing}
            onRefresh={() => refreshAnalysis()}
            tintColor={COLORS.solanaGreen}
            colors={[COLORS.solanaGreen]}
            progressBackgroundColor={COLORS.bgCard}
          />
        }
      >
        <Text style={styles.screenTitle}>{t.advisor.title}</Text>

        <VoicePlayer
          title={t.advisor.voiceTitle}
          poweredByLabel={
            voiceMode === "device"
              ? t.advisor.poweredByDeviceTts
              : t.advisor.poweredByEleven
          }
          playLabel={t.advisor.playBtn}
          stopLabel={t.advisor.pauseBtn}
          loadingLabel={t.advisor.loadingVoice}
          transcript={analysis?.voiceScript ?? null}
          isPlaying={isPlayingAudio}
          isLoading={isLoadingAudio}
          onTogglePlay={toggleVoiceBriefing}
        />

        {isAnalyzing && !analysis ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.solanaGreen} />
            <Text style={styles.loadingText}>{t.advisor.analyzing}</Text>
          </View>
        ) : analysis ? (
          <>
            <Text style={styles.headline}>{analysis.headline}</Text>

            <Text style={styles.sectionLabel}>{t.advisor.insightsTitle}</Text>
            <View style={styles.stack}>
              {analysis.insights.map((ins, idx) => {
                const pillBg =
                  ins.severity === "high"
                    ? COLORS.redDim
                    : ins.severity === "medium"
                      ? COLORS.amberDim
                      : COLORS.solanaGreenDim;
                const pillColor =
                  ins.severity === "high"
                    ? COLORS.red
                    : ins.severity === "medium"
                      ? COLORS.amber
                      : COLORS.solanaGreen;

                return (
                  <View key={idx} style={styles.insightCard}>
                    <View style={styles.insightHead}>
                      <View style={[styles.sevPill, { backgroundColor: pillBg }]}>
                        <Text style={[styles.sevText, { color: pillColor }]}>
                          {ins.severity.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.insightTitle}>{ins.title}</Text>
                    </View>
                    <Text style={styles.insightDetail}>{ins.detail}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>
              {t.advisor.quickQuestionsTitle}
            </Text>
            <View style={styles.chipsRow}>
              {t.advisor.questions.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.chip}
                  disabled={isAnalyzing}
                  onPress={() => refreshAnalysis({ userQuestion: q })}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sourcesCard}>
              <View style={styles.sourcesHeader}>
                <Text style={styles.sourcesTitle}>
                  {t.advisor.liveSourcesTitle}
                </Text>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  disabled={isAnalyzing}
                  onPress={() =>
                    refreshAnalysis({ forceRefreshFirecrawl: true })
                  }
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color={COLORS.solanaGreen} />
                  ) : (
                    <RefreshCw size={13} color={COLORS.solanaGreen} />
                  )}
                  <Text style={styles.refreshBtnText}>
                    {t.advisor.refreshLiveBtn}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stack}>
                {analysis.sources.map((src) => (
                  <TouchableOpacity
                    key={src.slug}
                    style={styles.sourceItem}
                    onPress={() => Linking.openURL(src.url)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceName}>{src.name}</Text>
                      <Text style={styles.sourceTime}>
                        {new Date(src.fetchedAt).toLocaleTimeString()} ·{" "}
                        {src.cached ? "Cached" : "Live Scrape"}
                      </Text>
                    </View>
                    <ExternalLink size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 23,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stack: {
    gap: 10,
  },
  insightCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  insightHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sevPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sevText: {
    fontSize: 10,
    fontWeight: "800",
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  insightDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  sourcesCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sourcesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  sourcesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: COLORS.solanaGreen,
    fontSize: 11,
    fontWeight: "700",
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgSubtle,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  sourceName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  sourceTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
