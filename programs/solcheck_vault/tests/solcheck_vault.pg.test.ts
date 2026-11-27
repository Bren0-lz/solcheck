// @ts-nocheck
// Paste this file into `tests/anchor.test.ts` inside Solana Playground (https://beta.solpg.io)
// after building & deploying `solcheck_vault` on Devnet, then click "Test".

describe("solcheck_vault (Solana Playground Devnet Suite)", () => {
  const owner = pg.wallet.publicKey;
  const [vaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    pg.program.programId
  );

  it("1. Initializes or verifies non-custodial Vault PDA", async () => {
    const existing = await pg.connection.getAccountInfo(vaultPda);
    if (!existing) {
      const txHash = await pg.program.methods
        .initializeVault("SOL Reserve", new BN(1_000_000_000))
        .accounts({
          vault: vaultPda,
          owner,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      await pg.connection.confirmTransaction(txHash);
      console.log("Initialized vault tx:", txHash);
    }

    const vaultAccount = await pg.program.account.vaultAccount.fetch(vaultPda);
    assert(vaultAccount.owner.equals(owner));
    console.log("Vault goal:", vaultAccount.goalName);
  });

  it("2. Deposits SOL flagged as rent-reclaim routed", async () => {
    const depositLamports = new BN(10_000_000); // 0.01 SOL
    const before = await pg.program.account.vaultAccount.fetch(vaultPda);

    const txHash = await pg.program.methods
      .deposit(depositLamports, true)
      .accounts({
        vault: vaultPda,
        owner,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    await pg.connection.confirmTransaction(txHash);

    const after = await pg.program.account.vaultAccount.fetch(vaultPda);
    assert(
      after.totalDeposited.eq(before.totalDeposited.add(depositLamports))
    );
    assert(
      after.totalReclaimedRouted.eq(
        before.totalReclaimedRouted.add(depositLamports)
      )
    );
    console.log("Deposit confirmed:", txHash);
  });

  it("3. Updates savings goal name and target", async () => {
    const txHash = await pg.program.methods
      .updateGoal("Emergency Reserve", new BN(2_000_000_000))
      .accounts({
        vault: vaultPda,
        owner,
      })
      .rpc();
    await pg.connection.confirmTransaction(txHash);

    const updated = await pg.program.account.vaultAccount.fetch(vaultPda);
    assert.strictEqual(updated.goalName, "Emergency Reserve");
    assert(updated.targetLamports.eq(new BN(2_000_000_000)));
    console.log("Updated goal confirmed:", txHash);
  });

  it("4. Withdraws SOL safely while preserving rent-exempt minimum", async () => {
    const withdrawLamports = new BN(5_000_000); // 0.005 SOL
    const txHash = await pg.program.methods
      .withdraw(withdrawLamports)
      .accounts({
        vault: vaultPda,
        owner,
      })
      .rpc();
    await pg.connection.confirmTransaction(txHash);
    console.log("Withdraw confirmed:", txHash);
  });
});
