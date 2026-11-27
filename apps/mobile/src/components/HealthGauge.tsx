import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../theme";
import { HealthStatus } from "../types/api";

interface HealthGaugeProps {
  score: number;
  status: HealthStatus;
  statusLabel: string;
  solBalance: number;
  solBalanceLabel: string;
}

export function HealthGauge({
  score,
  status,
  statusLabel,
  solBalance,
  solBalanceLabel,
}: HealthGaugeProps) {
  const size = 128;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const ringColor =
    status === "healthy"
      ? COLORS.solanaGreen
      : status === "needs_attention"
        ? COLORS.amber
        : COLORS.red;

  const badgeBg =
    status === "healthy"
      ? COLORS.solanaGreenDim
      : status === "needs_attention"
        ? COLORS.amberDim
        : COLORS.redDim;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.svgContainer}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={COLORS.borderSubtle}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
              fill="none"
            />
          </Svg>
          <View style={styles.centerText}>
            <Text style={[styles.scoreValue, { color: ringColor }]}>
              {clamped}
            </Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: ringColor }]}>
              ● {statusLabel}
            </Text>
          </View>

          <Text style={styles.balanceLabel}>{solBalanceLabel}</Text>
          <Text style={styles.balanceValue}>{solBalance.toFixed(4)} SOL</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  svgContainer: {
    width: 128,
    height: 128,
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  scoreMax: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  rightCol: {
    flex: 1,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
});
