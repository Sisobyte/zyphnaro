// Region eligibility helpers shared by the match engine, the app and the
// notification job. The same terms are sent to the database ranking function
// (migration 0015), which does a plain "location contains term" check, so the
// terms here are always lowercase and deliberately not too short: a short term
// like "us" would match inside "business".

// A job location that doesn't restrict who can apply.
export function isOpenLocation(location?: string | null): boolean {
  const loc = (location ?? "").trim().toLowerCase();
  if (!loc) return true;
  if (/^(remote|worldwide|anywhere|global|international|anywhere in the world)$/.test(loc)) return true;
  return /(worldwide|anywhere|global)/.test(loc);
}

const NIGERIA_PLACES = [
  "nigeria", "lagos", "abuja", "port harcourt", "ibadan", "kano", "enugu", "kaduna", "benin city",
  "abeokuta", "owerri", "warri", "ilorin", "calabar", "akure", "asaba", "onitsha", "ikeja", "lekki",
  "federal capital territory",
];

// Country or city (as a lowercase fragment) -> extra terms a job might use for
// the wider region that country belongs to.
const REGION_ALIASES: { match: string[]; add: string[] }[] = [
  { match: ["nigeria", ...NIGERIA_PLACES], add: NIGERIA_PLACES.concat(["africa", "west africa", "emea"]) },
  {
    match: ["ghana", "kenya", "south africa", "egypt", "uganda", "tanzania", "ethiopia", "rwanda", "senegal", "cameroon", "morocco", "africa"],
    add: ["africa", "emea"],
  },
  {
    match: ["germany", "france", "united kingdom", "ireland", "spain", "italy", "netherlands", "poland", "portugal", "europe"],
    add: ["europe", "emea"],
  },
  { match: ["united states", "usa", "canada"], add: ["united states", "usa", "north america", "americas"] },
];

// Everything about the candidate's place that a job location could mention:
// their profile location, preferred locations, each comma-separated part of
// those, and wider-region aliases (e.g. a Nigeria-based candidate also counts
// as eligible for "Africa" and "EMEA" listings). Empty means "unknown", and
// the engine then skips the region check rather than penalising everyone.
export function candidateRegionTerms(profileLocation: string | undefined | null, preferred: string[]): string[] {
  const base = [profileLocation ?? "", ...preferred]
    .flatMap((s) => s.split(/[,/;]/))
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3);

  const terms = new Set(base);
  for (const group of REGION_ALIASES) {
    if (base.some((b) => group.match.some((m) => b.includes(m)))) group.add.forEach((a) => terms.add(a));
  }
  return Array.from(terms);
}
