// Turns a profile's primary role ("Virtual Assistant & Digital Marketer") into
// short lowercase word stems that a listing title can be matched against
// ("virtua", "assist", "digita", "market"). Stems are cut to 6 characters so
// "marketer" also finds "Marketing", and "developer" finds "Development". Used
// by the Skill Gaps page to limit demand to listings in the user's own field.
// Plain substring matching, so the same stems work in SQL (skill_demand).

const IGNORE = new Set(["and", "the", "for", "with", "senior", "junior", "lead", "intern", "head"]);

export function roleStems(primaryRole: string | undefined | null): string[] {
  const stems = (primaryRole ?? "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length >= 4 && !IGNORE.has(w))
    .map((w) => w.slice(0, 6));
  return Array.from(new Set(stems));
}
