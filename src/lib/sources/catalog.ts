// Static catalog of known sources — name, description, and whether auth is
// required. This is app configuration, not user data, so it lives in code
// rather than a table. Per-user connection state (status, opportunities
// discovered, last sync) lives in the `source_connections` table and is
// merged with this catalog by SupabaseSourceRepository.
//
// `defaultStatus` reflects real-world integration status honestly (see
// /docs/source-integrations.md) rather than demo flavor: sources with no
// real adapter built yet default to "planned" even if their API is
// technically usable, and Reddit defaults to "limited" since Reddit closed
// self-serve API registration in November 2025.

import { JOOBLE_REGIONS } from "./jooble-regions";
import { MYJOBMAG_FEEDS } from "./myjobmag-feeds";

export interface SourceCatalogEntry {
  id: string;
  name: string;
  description: string;
  requiresAuth: boolean;
  defaultStatus: "connected" | "available" | "planned" | "limited";
}

// Jooble and MyJobMag entries are generated from their own region/feed
// registries rather than hand-written here, so adding a country to
// jooble-regions.ts or myjobmag-feeds.ts automatically gives it a Sources
// page entry too — no second place to remember to update.
const joobleCatalogEntries: SourceCatalogEntry[] = JOOBLE_REGIONS.map((region) => ({
  id: `jooble-${region.code}`,
  name: `Jooble ${region.label}`,
  description: `Aggregated job search covering ${region.label}, via Jooble.`,
  requiresAuth: false,
  defaultStatus: "connected",
}));

const myJobMagCatalogEntries: SourceCatalogEntry[] = MYJOBMAG_FEEDS.map((feed) => ({
  id: `myjobmag-${feed.label.toLowerCase().replace(/\s+/g, "-")}`,
  name: `MyJobMag ${feed.label}`,
  description: `Direct listings from MyJobMag's official ${feed.label} job feed.`,
  requiresAuth: false,
  defaultStatus: "connected",
}));

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  {
    id: "reddit",
    name: "Reddit",
    description: "Monitors hiring communities like r/forhire and r/remotejs for new posts.",
    requiresAuth: true,
    defaultStatus: "limited",
  },
  {
    id: "upwork",
    name: "Upwork",
    description: "Freelance contracts matched against your skills and rate expectations.",
    requiresAuth: true,
    defaultStatus: "planned",
  },
  {
    id: "freelancer",
    name: "Freelancer",
    description: "Freelance jobs and contests across a wide range of categories.",
    requiresAuth: true,
    defaultStatus: "planned",
  },
  {
    id: "adzuna",
    name: "Adzuna",
    description: "Aggregated job search engine covering listings across many boards.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    description: "Direct company career pages that use Greenhouse as their ATS.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "lever",
    name: "Lever",
    description: "Direct company career pages that use Lever as their ATS.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Public job listings only — full access requires LinkedIn partnership approval.",
    requiresAuth: true,
    defaultStatus: "limited",
  },
  {
    id: "indeed",
    name: "Indeed",
    description: "Planned integration, pending API access review.",
    requiresAuth: true,
    defaultStatus: "planned",
  },
  {
    id: "wellfound",
    name: "Wellfound",
    description: "Planned integration for early-stage startup roles.",
    requiresAuth: true,
    defaultStatus: "planned",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    description: "Planned integration for remote-first listings.",
    requiresAuth: false,
    defaultStatus: "planned",
  },
  {
    id: "remotive",
    name: "Remotive",
    description: "Curated remote jobs from Remotive's public API (delayed 24 hours by Remotive).",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    description: "Remote jobs from Remote OK's public feed.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "himalayas",
    name: "Himalayas",
    description: "Remote jobs with company profiles from Himalayas' public API.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    description: "Startup roles from the monthly 'Ask HN: Who is hiring?' thread.",
    requiresAuth: false,
    defaultStatus: "connected",
  },
  ...joobleCatalogEntries,
  ...myJobMagCatalogEntries,
];
