import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { EmptyTokenAccount } from "../types/api";
import idl from "./idl/solcheck_vault.json";
import { buildCloseEmptyAccountsInstructions } from "./reclaim";

const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

// Margin reserved when initializing the 109-byte VaultAccount PDA (~0.00165 SOL rent + tx fee)
const NEW_VAULT_RENT_MARGIN_LAMPORTS = 2_000_000;

function getInstructionDiscriminator(name: string): Buffer {
  const found = idl.instructions.find((ix) => ix.name === name);
  if (!found) {
    throw new Error(`Discriminator not found in IDL for instruction: ${name}`);
  }
  return Buffer.from(found.discriminator);
}

function encodeString(str: string): Buffer {
  const utf8 = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(utf8.length, 0);
  return Buffer.concat([len, utf8]);
}

function encodeU64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value, 0);
  return buf;
}

export function getConfiguredVaultProgramId(): PublicKey {
  const raw = process.env.EXPO_PUBLIC_VAULT_PROGRAM_ID?.trim() || idl.address;
  if (!raw || raw === PLACEHOLDER_PROGRAM_ID || raw.includes("<")) {
    throw new Error(
      "Vault Program ID is not configured yet. Deploy solcheck_vault on beta.solpg.io (Devnet) and set EXPO_PUBLIC_VAULT_PROGRAM_ID in apps/mobile/.env."
    );
  }
  return new PublicKey(raw);
}

export function deriveVaultPda(
  ownerPubkey: PublicKey,
  programId = getConfiguredVaultProgramId()
): PublicKey {
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), ownerPubkey.toBuffer()],
    programId
  );
  return vaultPda;
}

export function buildInitializeVaultIx(
  ownerPubkey: PublicKey,
  goalName: string,
  targetLamports: bigint
): TransactionInstruction {
  const trimmedName = goalName.trim().slice(0, 32) || "SOL Reserve";
  if (targetLamports <= BigInt(0)) {
    throw new Error("Target amount must be greater than zero.");
  }

  const programId = getConfiguredVaultProgramId();
  const vaultPda = deriveVaultPda(ownerPubkey, programId);
  const disc = getInstructionDiscriminator("initialize_vault");
  const data = Buffer.concat([
    disc,
    encodeString(trimmedName),
    encodeU64(targetLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildDepositIx(
  ownerPubkey: PublicKey,
  amountLamports: bigint,
  fromReclaim: boolean
): TransactionInstruction {
  if (amountLamports <= BigInt(0)) {
    throw new Error("Deposit amount must be greater than zero.");
  }

  const programId = getConfiguredVaultProgramId();
  const vaultPda = deriveVaultPda(ownerPubkey, programId);
  const disc = getInstructionDiscriminator("deposit");
  const data = Buffer.concat([
    disc,
    encodeU64(amountLamports),
    Buffer.from([fromReclaim ? 1 : 0]),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildWithdrawIx(
  ownerPubkey: PublicKey,
  amountLamports: bigint
): TransactionInstruction {
  if (amountLamports <= BigInt(0)) {
    throw new Error("Withdraw amount must be greater than zero.");
  }

  const programId = getConfiguredVaultProgramId();
  const vaultPda = deriveVaultPda(ownerPubkey, programId);
  const disc = getInstructionDiscriminator("withdraw");
  const data = Buffer.concat([disc, encodeU64(amountLamports)]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: true, isWritable: true },
    ],
    data,
  });
}

export function buildUpdateGoalIx(
  ownerPubkey: PublicKey,
  goalName: string,
  targetLamports: bigint
): TransactionInstruction {
  const trimmedName = goalName.trim().slice(0, 32) || "SOL Reserve";
  const programId = getConfiguredVaultProgramId();
  const vaultPda = deriveVaultPda(ownerPubkey, programId);
  const disc = getInstructionDiscriminator("update_goal");
  const data = Buffer.concat([
    disc,
    encodeString(trimmedName),
    encodeU64(targetLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: true, isWritable: false },
    ],
    data,
  });
}

/**
 * Atomic 1-Signature Combo (Mandatory Safe Order):
 * 1) Close up to 10 empty SPL accounts -> credits reclaimed SOL into owner wallet
 * 2) If !vaultInitialized -> initialize_vault("SOL Reserve", 1 SOL) funded by reclaimed SOL
 * 3) Deposit net reclaimed SOL into VaultAccount PDA with from_reclaim = true
 */
export function buildAtomicReclaimAndVaultTransaction(params: {
  ownerPubkey: PublicKey;
  accounts: EmptyTokenAccount[];
  vaultInitialized: boolean;
  defaultGoalName?: string;
  defaultTargetSol?: number;
}): {
  transaction: Transaction;
  closedCount: number;
  reclaimedLamports: number;
  depositedLamports: number;
} {
  const {
    instructions: closeIxs,
    selectedBatch,
    reclaimedLamports,
  } = buildCloseEmptyAccountsInstructions(params.ownerPubkey, params.accounts);

  if (closeIxs.length === 0) {
    throw new Error("No empty SPL accounts selected to reclaim.");
  }

  const tx = new Transaction().add(...closeIxs);

  if (!params.vaultInitialized) {
    const goalName = params.defaultGoalName?.trim() || "SOL Reserve";
    const targetSol = params.defaultTargetSol && params.defaultTargetSol > 0
      ? params.defaultTargetSol
      : 1.0;
    const targetLamports = BigInt(Math.round(targetSol * LAMPORTS_PER_SOL));
    tx.add(buildInitializeVaultIx(params.ownerPubkey, goalName, targetLamports));
  }

  const netDepositNumber = params.vaultInitialized
    ? reclaimedLamports
    : Math.max(0, reclaimedLamports - NEW_VAULT_RENT_MARGIN_LAMPORTS);

  if (netDepositNumber > 0) {
    tx.add(
      buildDepositIx(params.ownerPubkey, BigInt(netDepositNumber), true)
    );
  }

  return {
    transaction: tx,
    closedCount: selectedBatch.length,
    reclaimedLamports,
    depositedLamports: netDepositNumber,
  };
}
