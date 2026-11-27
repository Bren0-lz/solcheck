import { CheckSquare, Square } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../theme";
import { EmptyTokenAccount } from "../types/api";

interface TokenAccountRowProps {
  account: EmptyTokenAccount;
  selected: boolean;
  onToggle: (pubkey: string) => void;
}

function shortKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 5)}...${key.slice(-5)}`;
}

export function TokenAccountRow({
  account,
  selected,
  onToggle,
}: TokenAccountRowProps) {
  const sol = (account.reclaimableLamports / 1e9).toFixed(5);
  const isToken2022 = account.programId.startsWith("Tokenz");

  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() => onToggle(account.pubkey)}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        {selected ? (
          <CheckSquare size={19} color={COLORS.solanaGreen} />
        ) : (
          <Square size={19} color={COLORS.textMuted} />
        )}
        <View>
          <Text style={styles.mintText}>Mint: {shortKey(account.mint)}</Text>
          <Text style={styles.subText}>
            ATA {shortKey(account.pubkey)} · {isToken2022 ? "Token-2022" : "SPL"}
          </Text>
        </View>
      </View>

      <Text style={styles.solText}>+{sol} SOL</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  rowSelected: {
    borderColor: "rgba(20, 241, 149, 0.4)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mintText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  subText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  solText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.solanaGreen,
    fontVariant: ["tabular-nums"],
  },
});
