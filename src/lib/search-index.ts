import type { LucideIcon } from "lucide-react";
import {
  Upload,
  History,
  PlayCircle,
  SlidersHorizontal,
  Trash2,
  Bell,
  PlugZap,
  MapPin,
  Wand2,
} from "lucide-react";
import { navGroups } from "@/lib/nav-config";

// Everything the global search can jump to without a database lookup: every
// page in the sidebar plus the common things people do. Keywords are extra
// words people might type ("cv", "jobs", "password"), so searching "resume"
// finds CV & Profile even though the page isn't called that.

export interface SearchTarget {
  id: string;
  kind: "page" | "action";
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
}

const pageKeywords: Record<string, string[]> = {
  "/dashboard": ["home", "overview", "summary"],
  "/opportunities": ["jobs", "listings", "roles", "browse", "find", "search jobs"],
  "/matches": ["best", "strong", "recommended", "top jobs"],
  "/role-explorer": ["careers", "paths", "related roles", "explore roles"],
  "/profile": ["cv", "resume", "skills", "experience", "education", "headline", "profile"],
  "/cv-analyzer": ["cv", "resume", "ats", "score", "analyse", "analyze", "review my cv"],
  "/tailored-cvs": ["tailor", "customise", "customize", "cv for job", "saved cvs"],
  "/skill-gaps": ["skills", "missing skills", "demand", "learn", "improve"],
  "/applications": ["applied", "tracker", "pipeline", "board", "kanban", "saved jobs", "offers"],
  "/interview-practice": ["interview", "mock", "questions", "practice", "voice"],
  "/notifications": ["alerts", "inbox", "bell", "messages"],
  "/sources": ["job boards", "connect", "integrations", "feeds", "linkedin", "adzuna"],
  "/analytics": ["stats", "charts", "insights", "market", "trends"],
  "/settings": ["account", "preferences", "password", "delete", "email", "avatar", "photo", "notifications"],
};

const pages: SearchTarget[] = navGroups.flatMap((group) =>
  group.items.map((item) => ({
    id: `page:${item.href}`,
    kind: "page" as const,
    label: item.label,
    hint: group.label,
    href: item.href,
    icon: item.icon,
    keywords: pageKeywords[item.href] ?? [],
  }))
);

const actions: SearchTarget[] = [
  { id: "action:upload-cv", kind: "action", label: "Upload or replace my CV", hint: "Settings", href: "/settings", icon: Upload, keywords: ["resume", "pdf", "file", "upload cv"] },
  { id: "action:saved-interviews", kind: "action", label: "View saved interviews", hint: "Interview Practice", href: "/interview-practice/saved", icon: History, keywords: ["history", "past interviews", "results"] },
  { id: "action:start-interview", kind: "action", label: "Start a practice interview", hint: "Interview Practice", href: "/interview-practice", icon: PlayCircle, keywords: ["mock", "begin", "new interview"] },
  { id: "action:match-score", kind: "action", label: "Change my minimum match score", hint: "Settings", href: "/settings", icon: SlidersHorizontal, keywords: ["threshold", "preferences", "alerts"] },
  { id: "action:alerts", kind: "action", label: "Turn job alerts on or off", hint: "Settings", href: "/settings", icon: Bell, keywords: ["notifications", "notify", "email alerts"] },
  { id: "action:sources", kind: "action", label: "Turn job sources on or off", hint: "Sources", href: "/sources", icon: PlugZap, keywords: ["connect", "disconnect", "boards"] },
  { id: "action:location", kind: "action", label: "Change my location or remote preference", hint: "Settings", href: "/settings", icon: MapPin, keywords: ["country", "city", "remote", "hybrid", "onsite"] },
  { id: "action:tailor", kind: "action", label: "Tailor my CV to a job", hint: "Opportunities", href: "/opportunities", icon: Wand2, keywords: ["customise", "customize", "tailored cv"] },
  { id: "action:delete", kind: "action", label: "Delete my account", hint: "Settings", href: "/settings", icon: Trash2, keywords: ["remove account", "close account", "privacy"] },
];

export const staticTargets: SearchTarget[] = [...pages, ...actions];

function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/**
 * Scores a target against what was typed. Every word typed must appear
 * somewhere (label, hint or keywords); matches at the start of the label rank
 * highest, then anywhere in the label, then keywords. Returns 0 for no match.
 */
export function scoreTarget(target: { label: string; hint?: string; keywords?: string[] }, query: string): number {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const label = norm(target.label);
  const hint = norm(target.hint ?? "");
  const keys = (target.keywords ?? []).map(norm);
  let total = 0;
  for (const w of words) {
    let s = 0;
    if (label.startsWith(w)) s = 100;
    else if (label.split(/[\s&/-]+/).some((t) => t.startsWith(w))) s = 80;
    else if (label.includes(w)) s = 60;
    else if (keys.some((k) => k.startsWith(w))) s = 50;
    else if (keys.some((k) => k.includes(w))) s = 35;
    else if (hint.includes(w)) s = 20;
    if (s === 0) return 0;
    total += s;
  }
  return total / words.length;
}

export function searchStatic(query: string, limit = 8): SearchTarget[] {
  return staticTargets
    .map((t) => ({ t, s: scoreTarget(t, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}
