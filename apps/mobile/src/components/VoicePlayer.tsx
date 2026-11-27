import { Play, Square, Volume2 } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../theme";

interface VoicePlayerProps {
  title: string;
  poweredByLabel: string;
  playLabel: string;
  stopLabel: string;
  loadingLabel: string;
  transcript: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
}

export function VoicePlayer({
  title,
  poweredByLabel,
  playLabel,
  stopLabel,
  loadingLabel,
  transcript,
  isPlaying,
  isLoading,
  onTogglePlay,
}: VoicePlayerProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Volume2 size={18} color={COLORS.solanaPurple} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{poweredByLabel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.playButton,
          (!transcript || isLoading) && styles.playButtonDisabled,
        ]}
        disabled={!transcript || isLoading}
        onPress={onTogglePlay}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isPlaying ? (
          <Square size={16} color="#FFFFFF" />
        ) : (
          <Play size={16} color="#FFFFFF" />
        )}
        <Text style={styles.playButtonText}>
          {isLoading ? loadingLabel : isPlaying ? stopLabel : playLabel}
        </Text>
      </TouchableOpacity>

      {isPlaying && (
        <View style={styles.waveRow}>
          {[12, 22, 16, 26, 14, 24, 18, 28, 15, 20, 12].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: h }]} />
          ))}
        </View>
      )}

      {transcript ? (
        <Text style={styles.transcript}>“{transcript}”</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: COLORS.solanaPurpleDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#C49BFF",
  },
  playButton: {
    backgroundColor: COLORS.solanaPurple,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  playButtonDisabled: {
    opacity: 0.55,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 30,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: COLORS.solanaPurple,
  },
  transcript: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
});
