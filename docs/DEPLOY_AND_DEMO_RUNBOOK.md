# SolCheck — Deployment & Live Demo Runbook (Dev3pack Hackathon)

This runbook condenses the exact operational commands to deploy all layers of **SolCheck** on **Solana Devnet**, **Supabase**, **Vercel**, and **Android (Solana Mobile MWA)**.

---

## Step 1 — Deploy `solcheck_vault` on Solana Devnet (`beta.solpg.io`)

1. Open [Solana Playground](https://beta.solpg.io/) and create a new **Anchor (Rust)** project named `solcheck_vault`.
2. Connect the Playground wallet (bottom-left) to **Devnet** and run `solana airdrop 2` in the Playground terminal if needed.
3. Paste [`programs/solcheck_vault/src/lib.rs`](../programs/solcheck_vault/src/lib.rs) into `src/lib.rs`.
4. Click **Build**, then click **Deploy**.
5. *(Optional verification)* Paste [`programs/solcheck_vault/tests/solcheck_vault.pg.test.ts`](../programs/solcheck_vault/tests/solcheck_vault.pg.test.ts) into `tests/anchor.test.ts` and click **Test** to verify all 4 instructions (`initialize_vault`, `deposit`, `update_goal`, `withdraw`) on Devnet.
6. Copy the deployed **Program ID** and sync the entire monorepo in one command:
   ```bash
   npx tsx scripts/set-program-id.ts <YOUR_DEPLOYED_PROGRAM_ID>
   ```

---

## Step 2 — Setup Supabase PostgreSQL

1. Create a Supabase project (e.g. `solcheck-dev`).
2. Open **SQL Editor → New Query**, paste [`supabase/schema.sql`](../supabase/schema.sql), and click **Run**.
3. Copy `Project URL` (`SUPABASE_URL`) and `service_role` secret (`SUPABASE_SERVICE_ROLE_KEY`) from **Project Settings → API**.

---

## Step 3 — Deploy Backend API & Web Preview on Vercel

1. Import `Bren0-lz/solcheck` into [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `apps/api`.
3. Add Environment Variables from [`apps/api/.env.example`](../apps/api/.env.example):
   - `SOLANA_RPC_URL` (Helius Devnet RPC URL)
   - `SOLCHECK_VAULT_PROGRAM_ID` (from Step 1)
   - `NEXT_PUBLIC_DEMO_WALLET` (your Phantom Android Devnet Base58 address)
   - `NEXT_PUBLIC_APK_DOWNLOAD_URL` (`https://github.com/Bren0-lz/solcheck/releases/latest`)
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
   - `FIRECRAWL_API_KEY`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_EN`, `ELEVENLABS_VOICE_ID_PT`
   - `GROQ_API_KEY`
4. Deploy and test `https://<your-project>.vercel.app` by clicking **Try Demo Wallet**.

---

## Step 4 — Seed 8 Empty SPL Token Accounts on Your Demo Wallet

Before testing on Android or recording the `< 3 min` demo video, populate your Phantom Devnet wallet with 8 refundable zero-balance SPL token accounts:

```bash
SOLANA_RPC_URL="https://devnet.helius-rpc.com/?api-key=<KEY>" \
  npx tsx scripts/seed-dirty-wallet.ts <YOUR_PHANTOM_DEVNET_WALLET>
```

---

## Step 5 — Build & Publish the Android `.apk`

### Option A — Cloud Build via GitHub Actions (Zero Local Android SDK Required)
1. Go to **GitHub → Actions → Build Android APK (Solana Mobile) → Run workflow**, passing your Vercel URL and `vault_program_id`, **OR** push a release tag:
   ```bash
   git tag v1.0.0-hackathon
   git push origin v1.0.0-hackathon
   ```
2. GitHub Actions compiles `solcheck-android.apk` and automatically publishes it to **GitHub Releases**.

### Option B — Local USB Build on Physical Android Phone
```bash
cd apps/mobile
cp .env.example .env
# Edit .env with EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_VAULT_PROGRAM_ID
npx expo prebuild --platform android
npx expo run:android
```
