use anchor_lang::prelude::*;
use anchor_lang::system_program;

// Replace with the Program ID generated upon deployment in Solana Playground (beta.solpg.io)
declare_id!("11111111111111111111111111111111");

#[program]
pub mod solcheck_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        goal_name: String,
        target_lamports: u64,
    ) -> Result<()> {
        require!(goal_name.len() <= 32, SolCheckError::GoalNameTooLong);
        require!(target_lamports > 0, SolCheckError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.goal_name = goal_name;
        vault.target_lamports = target_lamports;
        vault.total_deposited = 0;
        vault.total_reclaimed_routed = 0;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        Ok(())
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        from_reclaim: bool,
    ) -> Result<()> {
        require!(amount > 0, SolCheckError::InvalidAmount);

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(SolCheckError::MathOverflow)?;

        if from_reclaim {
            vault.total_reclaimed_routed = vault
                .total_reclaimed_routed
                .checked_add(amount)
                .ok_or(SolCheckError::MathOverflow)?;
        }

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, SolCheckError::InvalidAmount);

        let vault_info = ctx.accounts.vault.to_account_info();
        let owner_info = ctx.accounts.owner.to_account_info();

        let rent_min = Rent::get()?.minimum_balance(vault_info.data_len());
        let available = vault_info
            .lamports()
            .checked_sub(rent_min)
            .ok_or(SolCheckError::InsufficientVaultBalance)?;

        require!(available >= amount, SolCheckError::InsufficientVaultBalance);

        **vault_info.try_borrow_mut_lamports()? -= amount;
        **owner_info.try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    pub fn update_goal(
        ctx: Context<UpdateGoal>,
        goal_name: String,
        target_lamports: u64,
    ) -> Result<()> {
        require!(goal_name.len() <= 32, SolCheckError::GoalNameTooLong);
        require!(target_lamports > 0, SolCheckError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        vault.goal_name = goal_name;
        vault.target_lamports = target_lamports;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + VaultAccount::INIT_SPACE,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ SolCheckError::Unauthorized
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ SolCheckError::Unauthorized
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateGoal<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ SolCheckError::Unauthorized
    )]
    pub vault: Account<'info, VaultAccount>,
    pub owner: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultAccount {
    pub owner: Pubkey,
    #[max_len(32)]
    pub goal_name: String,
    pub target_lamports: u64,
    pub total_deposited: u64,
    pub total_reclaimed_routed: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum SolCheckError {
    #[msg("Goal name must be at most 32 characters.")]
    GoalNameTooLong,
    #[msg("Amount or target must be greater than zero.")]
    InvalidAmount,
    #[msg("Insufficient withdrawable balance in vault.")]
    InsufficientVaultBalance,
    #[msg("Only the vault owner can perform this action.")]
    Unauthorized,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
}
