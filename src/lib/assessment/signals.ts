// Responsibility signals: phrases that say what the hire will be accountable
// for, independent of profession (a head nurse "manages a team", a marketing
// lead "owns the strategy", an engineer "owns the architecture").
//
// Each signal has two patterns. `job` reads listing text ("lead the strategy"),
// `candidate` reads CV text in past tense ("led the strategy"). Both only match
// verb + object, so "mentorship from senior engineers" or "reporting to the
// team lead" do NOT fire.

import type { SignalId } from "./types";

export interface SignalDef {
  id: SignalId;
  label: string;
  job: RegExp;
  candidate: RegExp;
}

const W2 = String.raw`(?:[\w-]+\s+){0,2}`;

export const SIGNALS: SignalDef[] = [
  {
    id: "strategy",
    label: "setting strategy or direction",
    job: new RegExp(String.raw`\b(?:lead|leading|define|defining|set|setting|own|owning|drive|driving|shape|shaping)\s+(?:the\s+|our\s+|a\s+)?${W2}(?:strategy|vision|roadmap)\b`),
    candidate: new RegExp(String.raw`\b(?:led|lead|defined|set|owned|drove|shaped|developed)\s+(?:the\s+|our\s+|a\s+)?${W2}(?:strategy|vision|roadmap)\b`),
  },
  {
    id: "architecture",
    label: "owning architecture across systems",
    job: new RegExp(
      String.raw`\b(?:own|owning|lead|leading|define|defining|drive|driving|set|setting)\s+(?:the\s+|our\s+|end-to-end\s+)?${W2}architecture\b` +
        String.raw`|\barchitecture\s+(?:across|of)\s+(?:multiple|several|all|our|the)?\s*${W2}(?:systems|services|platforms|products|teams)\b`
    ),
    candidate: new RegExp(
      String.raw`\b(?:architected|designed|owned|led|defined|drove)\s+(?:the\s+|our\s+|a\s+)?${W2}${W2}(?:architecture|system design)\b` +
        String.raw`|\barchitect(?:ed|ing)\b`
    ),
  },
  {
    id: "mentoring",
    label: "mentoring other people",
    job: /\b(?:mentor|mentoring|mentors|coach|coaching)\s+(?:and\s+\w+\s+)?(?:junior|senior|mid-level|other|fellow|team|engineers|developers|analysts|designers|staff|colleagues|members|talent|new hires|the team)\b/,
    candidate: /\b(?:mentored|mentoring|coached|coaching|trained)\s+(?:\w+\s+){0,2}(?:junior|engineers|developers|team|staff|interns|colleagues|members|analysts|designers|nurses|associates)\b/,
  },
  {
    id: "people-management",
    label: "managing a team",
    job: new RegExp(
      String.raw`\b(?:manage|managing|supervise|supervising|oversee|overseeing|lead|leading|head|heading|build|building)\s+(?:and\s+\w+\s+)?(?:a\s+|the\s+|our\s+)?(?:cross-functional\s+|global\s+|distributed\s+|small\s+|large\s+)?(?:team|teams|staff|department|direct reports|engineers|developers|analysts|nurses|technicians|associates)\b` +
        String.raw`|\bdirect reports?\b|\bline[- ]manag`
    ),
    candidate: new RegExp(
      String.raw`\b(?:managed|led|supervised|oversaw|headed|built|hired)\s+(?:and\s+\w+\s+)?(?:a\s+|the\s+|our\s+)?(?:cross-functional\s+|global\s+|distributed\s+|small\s+)?(?:team|teams|staff|department|engineers|developers|analysts|nurses|technicians|associates)\b` +
        String.raw`|\b(?:team|tech|engineering) lead\b`
    ),
  },
  {
    id: "org-standards",
    label: "setting standards across the organisation",
    job: new RegExp(
      String.raw`\b(?:org(?:ani[sz]ation)?|company|firm|enterprise)[- ]?wide\b` +
        String.raw`|\bacross (?:the |our )?(?:entire\s+)?(?:org(?:ani[sz]ation)?|company|enterprise|business)\b` +
        String.raw`|\b(?:set|define|establish|drive|own)\s+(?:the\s+|our\s+)?${W2}(?:standards|best practices|guidelines|policies|frameworks)\b`
    ),
    candidate: new RegExp(
      String.raw`\b(?:org(?:ani[sz]ation)?|company|firm)[- ]?wide\b` +
        String.raw`|\b(?:established|defined|introduced|set|created)\s+(?:the\s+|our\s+)?${W2}(?:standards|best practices|guidelines|policies|frameworks)\b`
    ),
  },
  {
    id: "budget-ownership",
    label: "owning a budget",
    job: /\b(?:own|owning|manage|managing|responsible for)\s+(?:the\s+|our\s+|a\s+)?(?:[\w-]+\s+)?(?:budget|p&l|profit and loss)\b/,
    candidate: /\b(?:managed|owned|controlled)\s+(?:a\s+|the\s+)?(?:\$?[\d.,]+[kmb]?\s+)?(?:[\w-]+\s+)?(?:budget|p&l)\b/,
  },
];

export function signalLabel(id: SignalId): string {
  return SIGNALS.find((s) => s.id === id)?.label ?? id;
}
