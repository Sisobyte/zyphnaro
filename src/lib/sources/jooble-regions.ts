// Jooble (https://jooble.org) requires a SEPARATE API key per country/region
// — a key registered on ng.jooble.org/api/about only works against Nigeria's
// index, not South Africa's or Egypt's. See /docs/source-integrations.md.
//
// To add another African country later:
//   1. Register a free key at https://{code}.jooble.org/api/about
//   2. Add one entry to JOOBLE_REGIONS below
//   3. Set the matching JOOBLE_<CODE>_API_KEY env var (e.g. JOOBLE_ZA_API_KEY)
// No other code changes needed — jooble-source.ts builds one full JobSource
// per entry in this list automatically.

export interface JoobleRegionConfig {
  // Jooble's own country/subdomain code — also used to build the env var
  // name (JOOBLE_<CODEUPPERCASE>_API_KEY) and the API host (<code>.jooble.org).
  code: string;
  // Human-readable label — shows up as this source's name, e.g. "Jooble Nigeria".
  label: string;
  // Sent as the `location` search parameter. A whole-country name keeps the
  // search broad (unfiltered by city), matching the Adzuna/Greenhouse/Lever
  // adapters' own "don't pre-filter — the match engine decides relevance"
  // approach.
  location: string;
}

export const JOOBLE_REGIONS: JoobleRegionConfig[] = [
  { code: "ng", label: "Nigeria", location: "Nigeria" },

  // Uncomment and set the matching env var to add more African markets —
  // confirmed live Jooble regions as of this writing (verify each one still
  // resolves and has its own API key before enabling):
  // { code: "za", label: "South Africa", location: "South Africa" },
  // { code: "eg", label: "Egypt", location: "Egypt" },
  // { code: "ma", label: "Morocco", location: "Morocco" },
];
