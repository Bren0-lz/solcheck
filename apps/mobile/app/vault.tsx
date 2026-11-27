import { LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import * as Linking from "expo-linking";
import { Sparkles, Wallet } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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
import { TokenAccountRow } from "../src/components/TokenAccountRow";
import { VaultCard } from "../src/components/VaultCard";
import { useSolCheck } from "../src/context/AppContext";
import { solcheckApi } from "../src/services/api";
import { formatWalletOrRpcError } from "../src/solana/errors";
import {
  buildReclaimOnlyTransaction,
  MAX_ACCOUNTS_PER_BATCH,
} from "../src/solana/reclaim";
import {
  buildAtomicReclaimAndVaultTransaction,
  buildDepositIx,
  buildInitializeVaultIx,
  buildUpdateGoalIx,
  buildWithdrawIx,
} from "../src/solana/vaultClient";
import { signAndSendMobileTransaction } from "../src/solana/wallet";
import { COLORS } from "../src/theme";
import { VaultActionType } from "../src/types/api";

export default function VaultScreen() {
  const {
    lang,
    t,
    walletAddress,
    isWatchOnly,
    connect,
    connecting,
    scanData,
    isScanning,
    refreshScan,
  } = useSolCheck();

  const [selectedPubkeys, setSelectedPubkeys] = useState<Set<string>>(
    new Set()
  );
  const [txBusy, setTxBusy] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  useEffect(() => {
    if (!scanData) {
      setSelectedPubkeys(new Set());
      return;
    }
    const initial = scanData.emptyAccounts
      .slice(0, MAX_ACCOUNTS_PER_BATCH)
      .map((a) => a.pubkey);
    setSelectedPubkeys(new Set(initial));
  }, [scanData]);

  const selectedAccounts = useMemo(() => {
    if (!scanData) return [];
    return scanData.emptyAccounts.filter((a) => selectedPubkeys.has(a.pubkey));
  }, [scanData, selectedPubkeys]);

  const selectedSol = useMemo(() => {
    const lamports = selectedAccounts.reduce(
      (sum, a) => sum + a.reclaimableLamports,
      0
    );
    return lamports / LAMPORTS_PER_SOL;
  }, [selectedAccounts]);

  if (!walletAddress || !scanData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyPrompt}>{t.common.connectPrompt}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function toggleAccount(pubkey: string) {
    setSelectedPubkeys((prev) => {
      const next = new Set(prev);
      if (next.has(pubkey)) {
        next.delete(pubkey);
      } else if (next.size < MAX_ACCOUNTS_PER_BATCH) {
        next.add(pubkey);
      }
      return next;
    });
  }

  function selectTopBatch() {
    if (!scanData) return;
    setSelectedPubkeys(
      new Set(
        scanData.emptyAccounts
          .slice(0, MAX_ACCOUNTS_PER_BATCH)
          .map((a) => a.pubkey)
      )
    );
  }

  function clearBatch() {
    setSelectedPubkeys(new Set());
  }

  async function finalizeTx(params: {
    signature: string;
    actionType: VaultActionType;
    accountsClosed: number;
    solAmount: number;
  }) {
    setLastTxSig(params.signature);
    try {
      await solcheckApi.logReclaimEvent({
        walletAddress: walletAddress!,
        txSignature: params.signature,
        actionType: params.actionType,
        accountsClosed: params.accountsClosed,
        solAmount: Number(params.solAmount.toFixed(9)),
      });
    } catch (err) {
      console.warn("[Vault] Reclaim log warning:", err);
    }
    await refreshScan();
  }

  async function handleReclaimOnly() {
    if (selectedAccounts.length === 0 || isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      let closed = 0;
      let lamports = 0;

      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const built = buildReclaimOnlyTransaction(signer, selectedAccounts);
          closed = built.closedCount;
          lamports = built.reclaimedLamports;
          return built.transaction;
        }
      );

      await finalizeTx({
        signature,
        actionType: "reclaim",
        accountsClosed: closed,
        solAmount: lamports / LAMPORTS_PER_SOL,
      });
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  async function handleAtomicReclaimAndVault() {
    if (selectedAccounts.length === 0 || isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      let closed = 0;
      let reclaimedLamports = 0;

      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const built = buildAtomicReclaimAndVaultTransaction({
            ownerPubkey: signer,
            accounts: selectedAccounts,
            vaultInitialized: scanData!.vault.initialized,
            defaultGoalName: "SOL Reserve",
            defaultTargetSol: 1.0,
          });
          closed = built.closedCount;
          reclaimedLamports = built.reclaimedLamports;
          return built.transaction;
        }
      );

      await finalizeTx({
        signature,
        actionType: "reclaim_and_vault",
        accountsClosed: closed,
        solAmount: reclaimedLamports / LAMPORTS_PER_SOL,
      });
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  async function handleCreateVault(goalName: string, targetSol: number) {
    if (isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      const targetLamports = BigInt(Math.round(targetSol * LAMPORTS_PER_SOL));
      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const ix = buildInitializeVaultIx(signer, goalName, targetLamports);
          return new Transaction().add(ix);
        }
      );

      setLastTxSig(signature);
      await refreshScan();
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  async function handleUpdateGoal(goalName: string, targetSol: number) {
    if (isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      const targetLamports = BigInt(Math.round(targetSol * LAMPORTS_PER_SOL));
      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const ix = buildUpdateGoalIx(signer, goalName, targetLamports);
          return new Transaction().add(ix);
        }
      );

      setLastTxSig(signature);
      await refreshScan();
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  async function handleVaultDeposit(solAmount: number) {
    if (isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      const lamports = BigInt(Math.round(solAmount * LAMPORTS_PER_SOL));
      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const ix = buildDepositIx(signer, lamports, false);
          return new Transaction().add(ix);
        }
      );

      await finalizeTx({
        signature,
        actionType: "vault_deposit",
        accountsClosed: 0,
        solAmount,
      });
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  async function handleVaultWithdraw(solAmount: number) {
    if (isWatchOnly) return;
    setTxBusy(true);
    setTxError(null);
    setLastTxSig(null);

    try {
      const lamports = BigInt(Math.round(solAmount * LAMPORTS_PER_SOL));
      const { signature } = await signAndSendMobileTransaction(
        async (signer) => {
          const ix = buildWithdrawIx(signer, lamports);
          return new Transaction().add(ix);
        }
      );

      await finalizeTx({
        signature,
        actionType: "vault_withdraw",
        accountsClosed: 0,
        solAmount,
      });
    } catch (err) {
      setTxError(formatWalletOrRpcError(err, lang));
    } finally {
      setTxBusy(false);
    }
  }

  const maxSelectable = Math.min(
    MAX_ACCOUNTS_PER_BATCH,
    scanData.emptyAccounts.length
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isScanning}
            onRefresh={() => refreshScan()}
            tintColor={COLORS.solanaGreen}
            colors={[COLORS.solanaGreen]}
            progressBackgroundColor={COLORS.bgCard}
          />
        }
      >
        {isWatchOnly && (
          <View style={styles.watchBanner}>
            <Text style={styles.watchBannerText}>{t.watchOnlySignHint}</Text>
            <TouchableOpacity
              style={styles.watchConnectBtn}
              disabled={connecting}
              onPress={connect}
            >
              <Wallet size={15} color="#06130D" />
              <Text style={styles.watchConnectBtnText}>
                {t.connectToSignBtn}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {txError ? <Text style={styles.errorBanner}>{txError}</Text> : null}

        {lastTxSig ? (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>{t.vault.txSuccessTitle}</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `https://explorer.solana.com/tx/${lastTxSig}?cluster=devnet`
                )
              }
            >
              <Text style={styles.successLink}>{t.vault.openTxExplorer}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section 1: Empty SPL Accounts Rent Reclaim */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.vault.reclaimSectionTitle}</Text>
          <Text style={styles.cardHint}>{t.vault.selectBatchHint}</Text>

          {scanData.emptyAccounts.length === 0 ? (
            <Text style={styles.emptyNote}>{t.vault.noEmptyAccounts}</Text>
          ) : (
            <>
              <View style={styles.batchToolbar}>
                <Text style={styles.batchCountText}>
                  {t.vault.batchSelected
                    .replace("{selected}", String(selectedAccounts.length))
                    .replace("{max}", String(maxSelectable))}
                </Text>
                <View style={styles.batchBtnsRow}>
                  <TouchableOpacity
                    style={styles.miniActionBtn}
                    onPress={selectTopBatch}
                  >
                    <Text style={styles.miniActionText}>
                      {t.vault.selectMaxBtn}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniActionBtn}
                    onPress={clearBatch}
                  >
                    <Text style={styles.miniActionText}>
                      {t.vault.clearSelectionBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.listStack}>
                {scanData.emptyAccounts.map((acc) => (
                  <TokenAccountRow
                    key={acc.pubkey}
                    account={acc}
                    selected={selectedPubkeys.has(acc.pubkey)}
                    onToggle={toggleAccount}
                  />
                ))}
              </View>

              {txBusy && (
                <View style={styles.signingRow}>
                  <ActivityIndicator size="small" color={COLORS.solanaGreen} />
                  <Text style={styles.signingText}>{t.common.signingTx}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.atomicBtn,
                  (txBusy || isWatchOnly || selectedAccounts.length === 0) &&
                    styles.disabledBtn,
                ]}
                disabled={
                  txBusy || isWatchOnly || selectedAccounts.length === 0
                }
                onPress={handleAtomicReclaimAndVault}
                activeOpacity={0.85}
              >
                <Sparkles size={17} color="#06130D" />
                <Text style={styles.atomicBtnText}>
                  {t.vault.reclaimAndVaultBtn}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reclaimOnlyBtn,
                  (txBusy || isWatchOnly || selectedAccounts.length === 0) &&
                    styles.disabledBtn,
                ]}
                disabled={
                  txBusy || isWatchOnly || selectedAccounts.length === 0
                }
                onPress={handleReclaimOnly}
                activeOpacity={0.85}
              >
                <Text style={styles.reclaimOnlyText}>
                  {t.vault.reclaimOnlyBtn.replace(
                    "{sol}",
                    selectedSol.toFixed(4)
                  )}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Section 2: On-Chain Goal Vault (Anchor PDA) */}
        <VaultCard
          vault={scanData.vault}
          t={t.vault}
          busy={txBusy || isWatchOnly}
          onCreateVault={handleCreateVault}
          onUpdateGoal={handleUpdateGoal}
          onDeposit={handleVaultDeposit}
          onWithdraw={handleVaultWithdraw}
        />
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
  watchBanner: {
    backgroundColor: COLORS.amberDim,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  watchBannerText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  watchConnectBtn: {
    backgroundColor: COLORS.solanaGreen,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  watchConnectBtnText: {
    color: "#06130D",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  batchToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  batchCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.solanaGreen,
    fontVariant: ["tabular-nums"],
  },
  batchBtnsRow: {
    flexDirection: "row",
    gap: 8,
  },
  miniActionBtn: {
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  miniActionText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },
  listStack: {
    gap: 8,
  },
  signingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  signingText: {
    color: COLORS.solanaGreen,
    fontSize: 13,
    fontWeight: "600",
  },
  atomicBtn: {
    backgroundColor: COLORS.solanaGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  atomicBtnText: {
    color: "#06130D",
    fontSize: 14,
    fontWeight: "800",
  },
  reclaimOnlyBtn: {
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  reclaimOnlyText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: COLORS.redDim,
    color: "#FCA5A5",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: COLORS.solanaGreenDim,
    borderWidth: 1,
    borderColor: "rgba(20, 241, 149, 0.4)",
    padding: 13,
    borderRadius: 12,
    gap: 4,
  },
  successTitle: {
    color: COLORS.solanaGreen,
    fontSize: 14,
    fontWeight: "800",
  },
  successLink: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
