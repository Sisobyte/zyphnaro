// Company boards to pull from for Greenhouse and Lever — both platforms
// expose a public, unauthenticated job board API per company, so there's
// no signup or key needed here, just the right "board token" (the slug in
// their public careers page URL).
//
// IMPORTANT — read before adding companies:
// This list is intentionally small and edit-friendly. Add or remove
// entries freely; the sync script (scripts/sync-sources.ts) skips and logs
// any company whose board token doesn't resolve, rather than failing the
// whole run — so it's safe to guess and prune later.
//
// Diversity note: Greenhouse/Lever's own customer base skews toward tech
// and tech-adjacent companies (40%+ of Greenhouse's customers, per public
// market data). Even a well-chosen company list here will surface mostly
// non-engineering roles WITHIN tech companies (marketing, sales, finance,
// support, recruiting, design) rather than true cross-industry diversity
// (retail, healthcare, education, hospitality). Adzuna is what actually
// carries cross-industry breadth — see adzuna-source.ts. This list is a
// supplementary layer, not the primary source of field diversity.
//
// Verification status: this sandbox's own network allowlist blocks
// boards-api.greenhouse.io and api.lever.co entirely (confirmed via a
// "x-deny-reason: host_not_allowed" response header when tested here) —
// so NONE of the tokens below could be live-tested from this environment,
// not even the ones cited as "confirmed" from public sources. "anthropic",
// "stripe", and "linear" are Greenhouse board tokens explicitly named in
// recent public sources discussing Greenhouse customers — reasonably
// trustworthy, but still unverified by an actual API call from here.
// Everything else is a plausible guess. Run
// `npm run sync:sources -- --dry-run` yourself to see which ones actually
// resolve before doing a real sync.

export const GREENHOUSE_COMPANIES: string[] = [
  "anthropic", // cited in public sources, not independently verified here
  "stripe", // cited in public sources, not independently verified here
  "airbnb",
  "coinbase",
  "robinhood",
  "figma",
  "brex",
];

export const LEVER_COMPANIES: string[] = [
  "toptal",
  "veeva",
  "netlight",
  "flynncompanies",
  "cbtnuggets",
  "masterycharter",
  "bricknetworks",
];
