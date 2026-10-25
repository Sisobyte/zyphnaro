// MyJobMag (https://www.myjobmag.com) publishes official RSS feeds — no
// scraping, no API key. Confirmed directly from their own feeds page
// (https://www.myjobmag.com/feeds/), which lists a Summarized Feed, a
// Detailed Feed, and two Aggregate Feeds. These URLs are PUBLIC — no secret
// involved — so they're safe to default directly in code below, unlike
// Jooble's API key (see jooble-regions.ts), which must stay in an env var.
//
// Using the Aggregate Feed: broadest coverage across every industry and
// location. The Detailed Feed is narrower (grouped by category) — set the
// matching env var below to switch to it, or to any other feed, without a
// code change.
//
// MyJobMag runs separate country sites with their own feeds — Nigeria,
// Ghana, Kenya, South Africa — confirmed via the "MYJOBMAG SITES" footer
// links on the feeds page. To add another country: visit that country's own
// myjobmag site's /feeds/ page (e.g. myjobmagghana.com/feeds/), copy its
// Aggregate Feed URL, and add one entry below. No other code changes needed.

export interface MyJobMagFeedConfig {
  label: string; // "Nigeria" — shows up as this source's name, "MyJobMag Nigeria"
  defaultUrl: string; // public feed URL — see comment above
  envKeyOverride: string; // set this env var to point at a different feed instead
}

export const MYJOBMAG_FEEDS: MyJobMagFeedConfig[] = [
  {
    label: "Nigeria",
    defaultUrl: "https://www.myjobmag.com/aggregate_feed.xml",
    envKeyOverride: "MYJOBMAG_NG_FEED_URL",
  },

  // Add more African markets by copying each country's own Aggregate Feed
  // URL from its /feeds/ page:
  // { label: "Ghana", defaultUrl: "https://www.myjobmagghana.com/aggregate_feed.xml", envKeyOverride: "MYJOBMAG_GH_FEED_URL" },
  // { label: "Kenya", defaultUrl: "https://www.myjobmagkenya.com/aggregate_feed.xml", envKeyOverride: "MYJOBMAG_KE_FEED_URL" },
  // { label: "South Africa", defaultUrl: "https://www.myjobmagsa.com/aggregate_feed.xml", envKeyOverride: "MYJOBMAG_ZA_FEED_URL" },
  // ^ these 3 URLs follow the Nigeria pattern but are NOT individually
  // confirmed — verify each one on that country's own /feeds/ page before
  // enabling, the same way the Nigeria URL was confirmed here.
];
