import * as fs from "fs";
import * as path from "path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

const DEFAULT_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const FUNDER_KEYPAIR_PATH = path.resolve(__dirname, ".funder-keypair.json");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadOrCreateFunderKeypair(): Keypair {
  if (fs.existsSync(FUNDER_KEYPAIR_PATH)) {
    const raw = JSON.parse(fs.readFileSync(FUNDER_KEYPAIR_PATH, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(
    FUNDER_KEYPAIR_PATH,
    JSON.stringify(Array.from(keypair.secretKey)),
    { mode: 0o600 }
  );
  console.log(`🔑 Created local funder keypair at ${FUNDER_KEYPAIR_PATH}`);
  return keypair;
}

function parseArgs(): { targetWallet: PublicKey; count: number } {
  const args = process.argv.slice(2);
  const walletArg = args.find((a) => !a.startsWith("--"));
  if (!walletArg) {
    console.error(
      "Usage: npx tsx scripts/seed-dirty-wallet.ts <TARGET_WALLET_BASE58> [--count=8]"
    );
    process.exit(1);
  }

  let targetWallet: PublicKey;
  try {
    targetWallet = new PublicKey(walletArg);
  } catch {
    console.error(`❌ Invalid Solana Base58 address: "${walletArg}"`);
    process.exit(1);
  }

  const countArg = args.find((a) => a.startsWith("--count="));
  const parsedCount = countArg ? Number(countArg.split("=")[1]) : 8;
  const count = Number.isFinite(parsedCount) && parsedCount > 0 && parsedCount <= 20
    ? Math.floor(parsedCount)
    : 8;

  return { targetWallet, count };
}

async function ensureFunderBalance(
  connection: Connection,
  funder: Keypair
): Promise<void> {
  const balance = await connection.getBalance(funder.publicKey);
  const balanceSol = balance / LAMPORTS_PER_SOL;
  console.log(
    `💰 Funder wallet: ${funder.publicKey.toBase58()} (${balanceSol.toFixed(4)} SOL)`
  );

  if (balanceSol >= 0.25) {
    return;
  }

  console.log("⏳ Funder balance < 0.25 SOL. Requesting 1 SOL airdrop on Devnet...");
  try {
    const sig = await connection.requestAirdrop(
      funder.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
    console.log(`✅ Airdrop confirmed! Tx: ${sig}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n⚠️ Public Devnet faucet rate-limited or unavailable (HTTP 429).");
    console.error(`   Error: ${msg}`);
    console.error("\n👉 Action required (one time only):");
    console.error("   1. Open https://faucet.solana.com/ (sign in with GitHub)");
    console.error("   2. Select Devnet and send 0.5 - 1.0 SOL to your local funder address:");
    console.error(`      ${funder.publicKey.toBase58()}`);
    console.error("   3. Re-run this script!\n");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const { targetWallet, count } = parseArgs();
  console.log(`\n🩺 SolCheck — Dirty Wallet Seeder (Solana Devnet)`);
  console.log(`🌐 RPC: ${DEFAULT_RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}`);
  console.log(`🎯 Target Wallet: ${targetWallet.toBase58()}`);
  console.log(`📦 Empty SPL Token Accounts to create: ${count}\n`);

  const connection = new Connection(DEFAULT_RPC_URL, "confirmed");
  const funder = loadOrCreateFunderKeypair();
  await ensureFunderBalance(connection, funder);

  const createdAccounts: Array<{
    index: number;
    mint: string;
    ata: string;
    rentLamports: number;
  }> = [];

  for (let i = 1; i <= count; i++) {
    process.stdout.write(`   [${i}/${count}] Creating test SPL mint & empty ATA... `);
    const mint = await createMint(
      connection,
      funder,
      funder.publicKey,
      null,
      6
    );
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      funder,
      mint,
      targetWallet
    );
    const accountInfo = await connection.getAccountInfo(ata.address);
    const rentLamports = accountInfo?.lamports ?? 2_039_280;

    createdAccounts.push({
      index: i,
      mint: mint.toBase58(),
      ata: ata.address.toBase58(),
      rentLamports,
    });
    console.log(`done (${ata.address.toBase58().slice(0, 8)}...)`);

    if (i < count) {
      await sleep(400);
    }
  }

  const totalLamports = createdAccounts.reduce((acc, r) => acc + r.rentLamports, 0);
  const totalSol = totalLamports / LAMPORTS_PER_SOL;

  console.log("\n📋 Created Empty SPL Accounts:");
  console.table(
    createdAccounts.map((item) => ({
      "#": item.index,
      Mint: item.mint,
      "Empty ATA (Owned by Target)": item.ata,
      "Locked Rent (SOL)": (item.rentLamports / LAMPORTS_PER_SOL).toFixed(8),
    }))
  );

  console.log(
    `\n✅ ${count} empty SPL accounts created for ${targetWallet.toBase58()}.`
  );
  console.log(
    `💎 Total Reclaimable Rent: ${totalSol.toFixed(6)} SOL (${totalLamports} lamports)`
  );
  console.log(
    `🔎 Verify on Solana Explorer: https://explorer.solana.com/address/${targetWallet.toBase58()}/tokens?cluster=devnet\n`
  );
}

main().catch((err) => {
  console.error("❌ Unexpected error in seed-dirty-wallet:", err);
  process.exit(1);
});
