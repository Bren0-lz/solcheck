-- SolCheck Database Schema (Supabase PostgreSQL)
-- Run directly in Supabase SQL Editor

-- 1. Perfis de carteiras conectadas
create table if not exists wallet_profiles (
  wallet_address text primary key,
  preferred_lang text not null default 'en' check (preferred_lang in ('en', 'pt')),
  total_sol_reclaimed numeric(18, 9) not null default 0,
  total_accounts_closed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Histórico de scans (Raio-X da carteira ao longo do tempo)
create table if not exists wallet_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references wallet_profiles(wallet_address) on delete cascade,
  cluster text not null default 'devnet',
  sol_balance numeric(18, 9) not null,
  empty_token_accounts integer not null,
  active_token_accounts integer not null,
  reclaimable_sol numeric(18, 9) not null,
  health_score integer not null check (health_score between 0 and 100),
  risk_flags jsonb not null default '[]'::jsonb,
  ai_summary_en text,
  ai_summary_pt text,
  created_at timestamptz not null default now()
);
create index if not exists idx_snapshots_wallet_date
  on wallet_snapshots (wallet_address, created_at desc);

-- 3. Registro de transações de resgate e depósitos no cofre (prova + histórico)
create table if not exists reclaim_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references wallet_profiles(wallet_address) on delete cascade,
  tx_signature text not null unique,
  action_type text not null check (action_type in ('reclaim', 'reclaim_and_vault', 'vault_deposit', 'vault_withdraw')),
  accounts_closed integer not null default 0,
  sol_amount numeric(18, 9) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_reclaim_wallet_date
  on reclaim_events (wallet_address, created_at desc);

-- 4. Cache de pesquisa ao vivo do Firecrawl (evita latência e economiza créditos)
create table if not exists protocol_research_cache (
  protocol_slug text primary key,
  source_url text not null,
  extracted_markdown text not null,
  structured_insights jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

-- Segurança / RLS:
-- Todas as leituras/escritas passam pelas API Routes do Next.js usando SUPABASE_SERVICE_ROLE_KEY.
alter table wallet_profiles enable row level security;
alter table wallet_snapshots enable row level security;
alter table reclaim_events enable row level security;
alter table protocol_research_cache enable row level security;
