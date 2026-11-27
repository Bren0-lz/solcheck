import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import { decodeVaultAccountData } from "../apps/api/lib/solana";
import {
  buildDepositIx,
  buildInitializeVaultIx,
  buildUpdateGoalIx,
  buildWithdrawIx,
  deriveVaultPda,
} from "../apps/mobile/src/solana/vaultClient";
import rootIdl from "../programs/solcheck_vault/idl/solcheck_vault.json";

const TEST_PROGRAM_ID = Keypair.generate().publicKey;

test("Anchor IDL discriminators match canonical SHA-256('global:<ix>') and SHA-256('account:VaultAccount')", () => {
  for (const ix of rootIdl.instructions) {
    const expected = Array.from(
      crypto.createHash("sha256").update(`global:${ix.name}`).digest().subarray(0, 8)
    );
    assert.deepEqual(
      ix.discriminator,
      expected,
      `Discriminator mismatch for instruction ${ix.name}`
    );
  }

  const vaultAcc = rootIdl.accounts.find((a) => a.name === "VaultAccount");
  assert.ok(vaultAcc);
  const expectedAccDisc = Array.from(
    crypto.createHash("sha256").update("account:VaultAccount").digest().subarray(0, 8)
  );
  assert.deepEqual(vaultAcc.discriminator, expectedAccDisc);
});

test("decodeVaultAccountData decodes binary Borsh VaultAccount layout accurately", () => {
  const owner = Keypair.generate().publicKey;
  const pda = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    TEST_PROGRAM_ID
  )[0];

  const disc = Buffer.from([230, 251, 241, 83, 139, 202, 93, 28]);
  const goalName = "Emergency SOL";
  const goalBytes = Buffer.from(goalName, "utf8");
  const goalLen = Buffer.alloc(4);
  goalLen.writeUInt32LE(goalBytes.length, 0);

  const metricsBuf = Buffer.alloc(33);
  metricsBuf.writeBigUInt64LE(1_000_000_000n, 0); // target_lamports = 1 SOL
  metricsBuf.writeBigUInt64LE(400_000_000n, 8);   // total_deposited = 0.4 SOL
  metricsBuf.writeBigUInt64LE(16_314_240n, 16);   // total_reclaimed_routed
  metricsBuf.writeBigInt64LE(1764244800n, 24);    // created_at
  metricsBuf.writeUInt8(254, 32);                 // bump

  const accountData = Buffer.concat([
    disc,
    owner.toBuffer(),
    goalLen,
    goalBytes,
    metricsBuf,
  ]);

  const rentExemptMin = 1_650_960;
  const rawAccountLamports = rentExemptMin + 250_000_000; // 0.25 SOL withdrawable

  const decoded = decodeVaultAccountData(
    accountData,
    pda,
    rawAccountLamports,
    rentExemptMin
  );

  assert.ok(decoded);
  assert.equal(decoded.initialized, true);
  assert.equal(decoded.pda, pda.toBase58());
  assert.equal(decoded.goalName, "Emergency SOL");
  assert.equal(decoded.targetLamports, 1_000_000_000);
  assert.equal(decoded.currentLamports, 250_000_000);
  assert.equal(decoded.totalDepositedLamports, 400_000_000);
  assert.equal(decoded.totalReclaimedRoutedLamports, 16_314_240);
  assert.equal(decoded.progressPercent, 25);
  assert.equal(decoded.createdAt, 1764244800);
});

test("decodeVaultAccountData rejects invalid discriminator or truncated buffer", () => {
  const pda = Keypair.generate().publicKey;
  assert.equal(decodeVaultAccountData(Buffer.alloc(32), pda, 2_000_000, 1_000_000), null);

  const badDisc = Buffer.alloc(109, 0xff);
  assert.equal(decodeVaultAccountData(badDisc, pda, 2_000_000, 1_000_000), null);
});

test("vaultClient builds Borsh instructions for all 4 Anchor instructions", () => {
  process.env.EXPO_PUBLIC_VAULT_PROGRAM_ID = TEST_PROGRAM_ID.toBase58();
  const owner = Keypair.generate().publicKey;
  const expectedPda = deriveVaultPda(owner, TEST_PROGRAM_ID);

  const initIx = buildInitializeVaultIx(owner, "Laptop Fund", 2_000_000_000n);
  assert.equal(initIx.programId.toBase58(), TEST_PROGRAM_ID.toBase58());
  assert.equal(initIx.keys[0].pubkey.toBase58(), expectedPda.toBase58());
  assert.equal(initIx.data.readUInt32LE(8), "Laptop Fund".length);

  const depIx = buildDepositIx(owner, 15_000_000n, true);
  assert.equal(depIx.data.readBigUInt64LE(8), 15_000_000n);
  assert.equal(depIx.data.readUInt8(16), 1);

  const wdIx = buildWithdrawIx(owner, 5_000_000n);
  assert.equal(wdIx.data.readBigUInt64LE(8), 5_000_000n);
  assert.equal(wdIx.keys.length, 2);

  const updIx = buildUpdateGoalIx(owner, "New Goal", 3_000_000_000n);
  assert.equal(updIx.data.readUInt32LE(8), "New Goal".length);
});
