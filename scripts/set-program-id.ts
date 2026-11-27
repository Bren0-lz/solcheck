import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";

const ROOT_DIR = path.resolve(__dirname, "..");

function updateFile(relPath: string, replacer: (content: string) => string): void {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ Skipped missing file: ${relPath}`);
    return;
  }
  const current = fs.readFileSync(fullPath, "utf8");
  const updated = replacer(current);
  fs.writeFileSync(fullPath, updated, "utf8");
  console.log(`✅ Updated ${relPath}`);
}

function main(): void {
  const rawProgramId = process.argv[2]?.trim();
  if (!rawProgramId) {
    console.error(
      "Usage: npx tsx scripts/set-program-id.ts <DEPLOYED_PROGRAM_ID_BASE58>"
    );
    process.exit(1);
  }

  let programPubkey: PublicKey;
  try {
    programPubkey = new PublicKey(rawProgramId);
  } catch {
    console.error(`❌ Invalid Solana Base58 Program ID: "${rawProgramId}"`);
    process.exit(1);
  }

  const programId = programPubkey.toBase58();
  if (programId === "11111111111111111111111111111111") {
    console.error(
      "❌ Program ID cannot be the System Program placeholder (1111...1111)."
    );
    process.exit(1);
  }

  console.log(`\n🔗 Syncing SolCheck Vault Program ID: ${programId}\n`);

  // 1. Update declare_id! in Rust contract
  updateFile("programs/solcheck_vault/src/lib.rs", (content) =>
    content.replace(/declare_id!\("[^"]+"\);/, `declare_id!("${programId}");`)
  );

  // 2. Update root IDL address
  updateFile("programs/solcheck_vault/idl/solcheck_vault.json", (content) => {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    parsed.address = programId;
    return JSON.stringify(parsed, null, 2) + "\n";
  });

  // 3. Update mobile IDL address
  updateFile("apps/mobile/src/solana/idl/solcheck_vault.json", (content) => {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    parsed.address = programId;
    return JSON.stringify(parsed, null, 2) + "\n";
  });

  // 4. Update .env.example templates
  updateFile("apps/api/.env.example", (content) =>
    content.replace(
      /^SOLCHECK_VAULT_PROGRAM_ID=.*$/m,
      `SOLCHECK_VAULT_PROGRAM_ID=${programId}`
    )
  );
  updateFile("apps/mobile/.env.example", (content) =>
    content.replace(
      /^EXPO_PUBLIC_VAULT_PROGRAM_ID=.*$/m,
      `EXPO_PUBLIC_VAULT_PROGRAM_ID=${programId}`
    )
  );

  console.log(
    `\n🎉 Done! Explorer URL: https://explorer.solana.com/address/${programId}?cluster=devnet\n`
  );
}

main();
