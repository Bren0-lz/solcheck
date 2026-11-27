import { getMemoryStore, getSupabaseAdmin } from "./supabase";
import { ProtocolSource } from "./types";

interface CuratedTarget {
  slug: string;
  name: string;
  url: string;
  fallbackExcerpt: string;
}

const CURATED_SOLANA_SOURCES: CuratedTarget[] = [
  {
    slug: "solana-rent",
    name: "Solana Docs — Rent & Account Fees",
    url: "https://solana.com/docs/core/fees",
    fallbackExcerpt:
      "Solana accounts require a rent-exempt minimum balance proportional to byte storage (~0.00203928 SOL for a standard 165-byte SPL Associated Token Account). Closing unused zero-balance SPL token accounts via closeAccount refunds 100% of the rent-exempt SOL deposit back to the owner.",
  },
  {
    slug: "solana-staking",
    name: "Solana — Staking & Capital Efficiency",
    url: "https://solana.com/staking",
    fallbackExcerpt:
      "Solana holders can allocate idle SOL into native stake accounts, liquid staking tokens, or non-custodial on-chain savings vaults to separate emergency reserves from daily spending wallets while maintaining full self-custody.",
  },
  {
    slug: "kamino-overview",
    name: "Kamino Docs — Solana DeFi Vaults & Risk Hygiene",
    url: "https://docs.kamino.finance/",
    fallbackExcerpt:
      "Automated Solana liquidity and lending vaults help manage capital efficiency, while revoking stale SPL token delegations and isolating long-term savings in audited PDA vaults reduces smart-contract exposure.",
  },
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_MARKDOWN_CHARS = 2500;

export interface FirecrawlResearchBundle {
  contextMarkdown: string;
  sources: ProtocolSource[];
}

function isFirecrawlConfigured(): boolean {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  return Boolean(key && !key.includes("<") && key.length > 8);
}

async function scrapeViaFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl HTTP ${response.status} for ${url}`);
  }

  const json = (await response.json()) as {
    success?: boolean;
    data?: { markdown?: string };
  };
  const markdown = json?.data?.markdown?.trim();
  if (!markdown) return null;

  return markdown.slice(0, MAX_MARKDOWN_CHARS);
}

export async function getSolanaEcosystemResearch(
  forceRefresh = false
): Promise<FirecrawlResearchBundle> {
  const supabase = getSupabaseAdmin();
  const memory = getMemoryStore();
  const nowIso = new Date().toISOString();

  // 1. Check valid cache (TTL 6h) unless forceRefresh is true
  if (!forceRefresh) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from("protocol_research_cache")
          .select(
            "protocol_slug, source_url, extracted_markdown, fetched_at, expires_at"
          )
          .gt("expires_at", nowIso);

        if (data && data.length >= CURATED_SOLANA_SOURCES.length) {
          const sources: ProtocolSource[] = [];
          const chunks: string[] = [];

          for (const target of CURATED_SOLANA_SOURCES) {
            const row = data.find((r) => r.protocol_slug === target.slug);
            if (row) {
              sources.push({
                slug: target.slug,
                name: target.name,
                url: String(row.source_url),
                fetchedAt: String(row.fetched_at),
                cached: true,
              });
              chunks.push(
                `### Source: ${target.name} (${row.source_url})\n${row.extracted_markdown}`
              );
            }
          }

          if (sources.length > 0) {
            return {
              contextMarkdown: chunks.join("\n\n"),
              sources,
            };
          }
        }
      } catch (err) {
        console.warn("[Firecrawl] Supabase cache read warning:", err);
      }
    } else {
      const validCached = CURATED_SOLANA_SOURCES.map((t) =>
        memory.researchCache.get(t.slug)
      ).filter(
        (item): item is NonNullable<typeof item> =>
          Boolean(item && new Date(item.expires_at).getTime() > Date.now())
      );

      if (validCached.length === CURATED_SOLANA_SOURCES.length) {
        return {
          contextMarkdown: validCached
            .map((c) => `### Source: ${c.protocol_slug} (${c.source_url})\n${c.extracted_markdown}`)
            .join("\n\n"),
          sources: CURATED_SOLANA_SOURCES.map((t) => {
            const c = memory.researchCache.get(t.slug)!;
            return {
              slug: t.slug,
              name: t.name,
              url: c.source_url,
              fetchedAt: c.fetched_at,
              cached: true,
            };
          }),
        };
      }
    }
  }

  // 2. Scrape live via Firecrawl (parallel with 8s timeout per URL)
  const sources: ProtocolSource[] = [];
  const chunks: string[] = [];
  const expiresAtIso = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  if (isFirecrawlConfigured()) {
    const settled = await Promise.allSettled(
      CURATED_SOLANA_SOURCES.map((target) => scrapeViaFirecrawl(target.url))
    );

    for (let i = 0; i < CURATED_SOLANA_SOURCES.length; i++) {
      const target = CURATED_SOLANA_SOURCES[i];
      const result = settled[i];
      const fetchedAt = new Date().toISOString();

      if (result.status === "fulfilled" && result.value) {
        const excerpt = result.value;
        sources.push({
          slug: target.slug,
          name: target.name,
          url: target.url,
          fetchedAt,
          cached: false,
        });
        chunks.push(`### Source: ${target.name} (${target.url})\n${excerpt}`);

        // Save fresh scrape to cache
        if (supabase) {
          try {
            await supabase.from("protocol_research_cache").upsert(
              {
                protocol_slug: target.slug,
                source_url: target.url,
                extracted_markdown: excerpt,
                structured_insights: { name: target.name },
                fetched_at: fetchedAt,
                expires_at: expiresAtIso,
              },
              { onConflict: "protocol_slug" }
            );
          } catch (err) {
            console.warn("[Firecrawl] Cache upsert warning:", err);
          }
        } else {
          memory.researchCache.set(target.slug, {
            protocol_slug: target.slug,
            source_url: target.url,
            extracted_markdown: excerpt,
            structured_insights: { name: target.name },
            fetched_at: fetchedAt,
            expires_at: expiresAtIso,
          });
        }
        continue;
      }

      // Fallback to expired Supabase row if Firecrawl failed momentarily on this URL
      let recoveredFromExpired = false;
      if (supabase) {
        try {
          const { data: expiredRow } = await supabase
            .from("protocol_research_cache")
            .select("extracted_markdown, fetched_at")
            .eq("protocol_slug", target.slug)
            .maybeSingle();

          if (expiredRow?.extracted_markdown) {
            sources.push({
              slug: target.slug,
              name: target.name,
              url: target.url,
              fetchedAt: String(expiredRow.fetched_at),
              cached: true,
            });
            chunks.push(
              `### Source: ${target.name} (${target.url})\n${expiredRow.extracted_markdown}`
            );
            recoveredFromExpired = true;
          }
        } catch {
          // ignore
        }
      }

      if (!recoveredFromExpired) {
        sources.push({
          slug: target.slug,
          name: target.name,
          url: target.url,
          fetchedAt,
          cached: true,
        });
        chunks.push(
          `### Source: ${target.name} (${target.url})\n${target.fallbackExcerpt}`
        );
      }
    }

    return {
      contextMarkdown: chunks.join("\n\n"),
      sources,
    };
  }

  // 3. Reference fallback when FIRECRAWL_API_KEY is not yet configured in local dev
  for (const target of CURATED_SOLANA_SOURCES) {
    sources.push({
      slug: target.slug,
      name: target.name,
      url: target.url,
      fetchedAt: nowIso,
      cached: true,
    });
    chunks.push(
      `### Source: ${target.name} (${target.url})\n${target.fallbackExcerpt}`
    );
  }

  return {
    contextMarkdown: chunks.join("\n\n"),
    sources,
  };
}
