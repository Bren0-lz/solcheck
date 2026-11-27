import * as Linking from "expo-linking";
import { Vault } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dictionary } from "../i18n";
import { COLORS } from "../theme";
import { VaultState } from "../types/api";

interface VaultCardProps {
  vault: VaultState;
  t: Dictionary["vault"];
  busy: boolean;
  onCreateVault: (goalName: string, targetSol: number) => Promise<void>;
  onDeposit: (solAmount: number) => Promise<void>;
  onWithdraw: (solAmount: number) => Promise<void>;
}

export function VaultCard({
  vault,
  t,
  busy,
  onCreateVault,
  onDeposit,
  onWithdraw,
}: VaultCardProps) {
  const [goalName, setGoalName] = useState("SOL Reserve");
  const [targetSolInput, setTargetSolInput] = useState("1.0");
  const [amountInput, setAmountInput] = useState("0.05");

  const currentSol = vault.currentLamports / 1e9;
  const targetSol = vault.targetLamports / 1e9;
  const reclaimedSol = vault.totalReclaimedRoutedLamports / 1e9;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Vault size={18} color={COLORS.solanaGreen} />
          <Text style={styles.title}>{t.vaultSectionTitle}</Text>
        </View>
      </View>

      {!vault.initialized ? (
        <View style={styles.formStack}>
          <View>
            <Text style={styles.label}>{t.goalNameLabel}</Text>
            <TextInput
              style={styles.input}
              value={goalName}
              onChangeText={setGoalName}
              maxLength={32}
              placeholder={t.goalNamePlaceholder}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View>
            <Text style={styles.label}>{t.targetSolLabel}</Text>
            <TextInput
              style={styles.input}
              value={targetSolInput}
              onChangeText={setTargetSolInput}
              keyboardType="decimal-pad"
              placeholder="1.0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.disabledBtn]}
            disabled={busy}
            onPress={() => {
              const parsed = Number(targetSolInput.replace(",", "."));
              if (Number.isFinite(parsed) && parsed > 0) {
                void onCreateVault(goalName, parsed);
              }
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#06130D" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.createVaultBtn}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formStack}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalName}>{vault.goalName}</Text>
            <Text style={styles.goalPercent}>{vault.progressPercent}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, vault.progressPercent)}%` },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t.currentSaved}</Text>
              <Text style={styles.statValue}>
                {currentSol.toFixed(4)} / {targetSol.toFixed(2)} SOL
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t.reclaimedRouted}</Text>
              <Text style={[styles.statValue, { color: COLORS.solanaGreen }]}>
                +{reclaimedSol.toFixed(4)} SOL
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder={t.depositPlaceholder}
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }, busy && styles.disabledBtn]}
              disabled={busy}
              onPress={() => {
                const parsed = Number(amountInput.replace(",", "."));
                if (Number.isFinite(parsed) && parsed > 0) {
                  void onDeposit(parsed);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>{t.depositBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { flex: 1 },
                busy && styles.disabledBtn,
              ]}
              disabled={busy}
              onPress={() => {
                const parsed = Number(amountInput.replace(",", "."));
                if (Number.isFinite(parsed) && parsed > 0) {
                  void onWithdraw(parsed);
                }
              }}
            >
              <Text style={styles.secondaryBtnText}>{t.withdrawBtn}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                `https://explorer.solana.com/address/${vault.pda}?cluster=devnet`
              )
            }
          >
            <Text style={styles.explorerLink}>{t.viewExplorer}</Text>
          </TouchableOpacity>
        </View>
      )}
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
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  formStack: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  primaryBtn: {
    backgroundColor: COLORS.solanaGreen,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#06130D",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  goalPercent: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.solanaGreen,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.solanaGreen,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  explorerLink: {
    fontSize: 12,
    color: COLORS.solanaGreen,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
});
