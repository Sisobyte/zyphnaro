import Link from "next/link";
import { Check, Radar } from "lucide-react";
import "@fontsource-variable/bricolage-grotesque/index.css";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroStage } from "@/components/landing/hero-stage";
import {
  AlertCard,
  Board,
  CvReport,
  InterviewReport,
  MatchReport,
  RegionCap,
  SourceSwitches,
  TrustReport,
} from "@/components/landing/vignettes";
import { SKILL_CATALOG } from "@/lib/sources/skill-catalog";
import { SKILL_VOCABULARY } from "@/lib/sources/skill-vocabulary";

// Built on the server from the real skill catalog, so the numbers and examples
// here are always the ones the app actually uses.
const fields = Object.entries(SKILL_CATALOG).map(([name, entries]) => ({
  name,
  samples: entries.slice(0, 4).map((e) => e.split("|")[0]),
}));

const sourceNames = ["Adzuna", "Greenhouse", "Lever", "Jooble", "MyJobMag", "Remotive", "Remote OK", "Himalayas", "Hacker News"];

const steps = [
  { title: "Add your CV", body: "Upload a PDF or fill in a profile. Zyphnaro lists your skills and you correct anything it got wrong." },
  { title: "Let it read the market", body: "Every day it reads new listings and ranks each one against your skills, level, role and location." },
  { title: "Open a job and see why", body: "You get the reasons for the score, what is missing, and a trust check on the listing." },
  { title: "Prepare for that job", body: "Tailor your CV to it, then practise the interview with an AI interviewer that marks you honestly." },
  { title: "Track it to an offer", body: "Move it across your board. New matching jobs reach you as alerts, so you hear about them first." },
];

const faqs = [
  {
    q: "Is Zyphnaro free?",
    a: "Yes. Everything on the site works on the free plan today. Pro and Career Agent plans are coming soon, and nothing is charged now.",
  },
  {
    q: "Where do the jobs come from?",
    a: "From company career pages (Greenhouse, Lever), job boards (Adzuna, Jooble, MyJobMag) and remote-work feeds (Remotive, Remote OK, Himalayas, and Hacker News' monthly hiring thread). Coverage differs by country and profession. Remote and tech roles have the most listings today, and Nigeria has its own sources.",
  },
  {
    q: "Does it apply to jobs for me?",
    a: "No. You apply on the original posting. Zyphnaro finds and ranks jobs, explains each match, checks the listing, prepares your CV and interview, and tracks your applications.",
  },
  {
    q: "How is the match score worked out?",
    a: "From four parts: your skills count for 45%, your level for 25%, your role for 20% and your location for 10%. If a job is restricted to a region you can't work in, the score is capped at 55 and the card says so.",
  },
  {
    q: "Does it only work for tech jobs?",
    a: `No. It recognises ${SKILL_VOCABULARY.length}+ skills across ${fields.length} fields, from plumbing and nursing to teaching, accounting and software. If listings in your field are thin where you live, you will see fewer matches, and the app tells you that instead of padding the list.`,
  },
  {
    q: "What happens to my CV?",
    a: "It is stored in a private folder that only your account can open. When you use CV features, the text is sent to Google's Gemini AI service to read it. You can replace the file or delete your whole account from Settings at any time, and everything goes with it.",
  },
  {
    q: "Can I practise interviews out loud?",
    a: "Yes. Choose voice mode, pick a female or male interviewer voice, and answer by speaking. Voices come from your browser, so they sound different on different devices. You can also type your answers.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-z-navy-950">
      <LandingNav />

      {/* Hero: the radar demo is the product in one picture */}
      <section className="bg-z-navy-950">
        <HeroStage>
          <h1 className="z-display text-[clamp(2.1rem,4.2vw,3.4rem)] font-bold leading-[1.02]">
            <span className="block text-z-slate-400">Thousands of listings.</span>
            <span className="block text-white">The few that fit you.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-z-slate-300">
            Zyphnaro reads job boards, company career pages and remote-work feeds every day, compares each listing with your CV, and shows you
            the ones worth applying for, with the reasons and a check on whether the listing can be trusted.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="rounded-lg bg-z-brand px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(61,90,254,0.8)] hover:bg-z-brand-600">
              Create free account
            </Link>
            <a href="#how" className="rounded-lg border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white hover:bg-white/5">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-z-slate-400">Free to start. Upload your CV or build a profile in a few minutes.</p>
        </HeroStage>
      </section>

      {/* Where jobs come from */}
      <section className="border-y border-white/10 bg-z-navy-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5">
          <p className="text-sm text-z-slate-400">Reads from</p>
          {sourceNames.map((s) => (
            <span key={s} className="text-sm font-medium text-z-slate-300">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Every profession */}
      <section id="fields" className="scroll-mt-16 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className="z-display max-w-xl text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">Built for every kind of work, not only tech.</h2>
            <p className="max-w-lg text-base leading-relaxed text-z-ink-soft">
              Zyphnaro recognises {SKILL_VOCABULARY.length}+ skills across {fields.length} fields. Tell it you are an electrician, a nurse or a
              bookkeeper, and it reads job posts the way someone in your trade would, then ranks them against your CV.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
              <div key={f.name} className="border-t border-z-border py-4">
                <p className="text-[15px] font-semibold text-z-ink">{f.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-z-ink-faint">{f.samples.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matching */}
      <section id="matching" className="scroll-mt-16 bg-z-surface py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="z-display text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">A score you can check.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-z-ink-soft">
              Every match is built from four things you can see: your skills, your level, your role and your location. Each job lists why you
              match and what to check before you apply, so you are not trusting a number you can&apos;t explain.
            </p>
            <div className="mt-6 max-w-md">
              <RegionCap />
            </div>
          </div>
          <MatchReport />
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <TrustReport />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="z-display text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">Know what you are applying to.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-z-ink-soft">
              Every listing gets a trust score from where it was posted, whether the company is real, and whether the apply link goes to the
              original post. Anything worth a second look is flagged.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-z-ink-soft">
              Zyphnaro never calls a listing a scam. It shows you what it found and lets you decide.
            </p>
          </div>
        </div>
      </section>

      {/* CV */}
      <section className="bg-z-surface py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="z-display text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">A CV for this job, using only what is true.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-z-ink-soft">
              The CV analyzer scores your CV the way hiring software reads it and tells you what to fix. Tailoring then rewords and reorders
              your real experience for one specific job.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-z-ink-soft">
              It never adds a skill you don&apos;t have. If the job asks for something missing from your CV, it tells you, and leaves it out.
            </p>
          </div>
          <CvReport />
        </div>
      </section>

      {/* Interview: the one dark chapter in the middle of the page */}
      <section className="bg-z-navy-950 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="z-display text-4xl font-bold leading-[1.02] text-white sm:text-5xl">Practise where the marking is honest.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-z-slate-300">
              An AI interviewer asks one question at a time, by voice in a female or male voice, or by text. Each answer is scored out of 100
              on what you actually said, with feedback on what to change.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-z-slate-300">
              Answer &ldquo;I don&apos;t know&rdquo; and you score 0, because a flattering mark helps nobody. Save an interview and open it
              again later to see how you improve.
            </p>
          </div>
          <InterviewReport />
        </div>
      </section>

      {/* Tracking and alerts */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <h2 className="z-display max-w-xl text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">From saved to offer, in one place.</h2>
            <p className="max-w-lg text-base leading-relaxed text-z-ink-soft">
              Move jobs across your board as they progress. When a new job that matches your CV is posted, you get a notification with the job
              in it. You set the minimum score, so you only hear about the ones that matter.
            </p>
          </div>
          <div className="mt-10">
            <Board />
          </div>
          <div className="mt-6 max-w-lg">
            <AlertCard />
          </div>
        </div>
      </section>

      {/* Sources */}
      <section id="sources" className="scroll-mt-16 bg-z-surface py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div className="order-2 max-w-md lg:order-1">
            <SourceSwitches />
            <p className="mt-3 text-xs text-z-ink-faint">Example switch positions. Every source is on until you turn it off.</p>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="z-display text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">You decide where jobs come from.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-z-ink-soft">
              Switch a source off and its jobs disappear from your lists, your matches and your alerts. Switch it back on and they return.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-z-ink-soft">
              Listings keep their link back to the original post, and sources that ask for credit get it.
            </p>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence */}
      <section id="how" className="scroll-mt-16 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="z-display max-w-2xl text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">From a CV to a shortlist in five steps.</h2>
          <ol className="relative mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
            <div className="absolute left-[19px] top-2 hidden h-[calc(100%-1rem)] w-px bg-z-border max-lg:block" aria-hidden="true" />
            <div className="absolute left-0 right-0 top-[19px] hidden h-px bg-z-border lg:block" aria-hidden="true" />
            {steps.map((s, i) => (
              <li key={s.title} className="relative pl-14 lg:pl-0 lg:pt-14">
                <span className="z-display absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-z-brand bg-z-brand-50 text-base font-semibold text-z-brand-600">
                  {i + 1}
                </span>
                <h3 className="text-[15px] font-semibold text-z-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-z-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 bg-z-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="z-display max-w-2xl text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">Free today. Paid plans are coming.</h2>
          <p className="mt-4 max-w-lg text-base text-z-ink-soft">Nothing is charged now, and no payment details are asked for.</p>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr_1fr]">
            <div className="rounded-2xl border-2 border-z-brand bg-white p-7 shadow-[0_24px_60px_-28px_rgba(61,90,254,0.55)]">
              <p className="text-lg font-semibold text-z-ink">Free</p>
              <p className="z-display mt-1 text-5xl font-bold text-z-ink">$0</p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-z-ink-soft">
                {["Daily job discovery from every source", "Match scores with reasons", "Trust checks on listings", "CV analysis and tailoring", "Interview practice, saved and reviewable", "Application board and new-match alerts"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-z-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-7 block rounded-lg bg-z-brand py-3 text-center text-[15px] font-semibold text-white hover:bg-z-brand-600">
                Create free account
              </Link>
            </div>

            {[
              { name: "Pro", price: "$19", line: "For people actively applying", items: ["Advanced matching", "Act Now alerts", "Deeper CV analysis", "Unlimited interview practice", "Recruiter intelligence"] },
              { name: "Career Agent", price: "$49", line: "For people who want it handled continuously", items: ["Everything in Pro", "Continuous opportunity monitoring", "A personal opportunity agent", "Priority alerts"] },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl border border-z-border bg-white/60 p-7">
                <p className="text-lg font-semibold text-z-ink-soft">{p.name}</p>
                <p className="z-display mt-1 text-4xl font-bold text-z-ink-faint">
                  {p.price}
                  <span className="text-base font-normal">/month</span>
                </p>
                <p className="mt-2 text-sm text-z-ink-faint">{p.line}</p>
                <ul className="mt-5 space-y-2 text-sm text-z-ink-faint">
                  {p.items.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-z-ink-faint" /> {f}
                    </li>
                  ))}
                </ul>
                <span aria-disabled="true" className="mt-6 block cursor-not-allowed rounded-lg bg-z-surface py-2.5 text-center text-sm font-semibold text-z-ink-faint">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.6fr]">
          <h2 className="z-display text-4xl font-bold leading-[1.02] text-z-ink sm:text-5xl">Questions people ask first.</h2>
          <div className="divide-y divide-z-border border-y border-z-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-z-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-z-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-z-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden bg-z-navy-950 py-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          {[1100, 800, 540, 300].map((d) => (
            <div key={d} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" style={{ width: d, height: d }} />
          ))}
        </div>
        <div className="relative mx-auto max-w-2xl px-5">
          <h2 className="z-display text-4xl font-bold leading-[1.02] text-white sm:text-5xl">Start with your CV. See what is worth your time.</h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-z-slate-300">
            It takes a few minutes to set up, and the first ranked list is waiting when you finish.
          </p>
          <Link href="/signup" className="mt-8 inline-block rounded-lg bg-z-brand px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(61,90,254,0.8)] hover:bg-z-brand-600">
            Create free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-z-navy-950 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 text-sm text-z-slate-400">
          <span className="flex items-center gap-2 font-medium text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-z-brand text-white">
              <Radar className="h-3.5 w-3.5" />
            </span>
            Zyphnaro
          </span>
          <a href="#fields" className="hover:text-white">Every profession</a>
          <a href="#matching" className="hover:text-white">Matching</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
          <Link href="/login" className="hover:text-white">Sign in</Link>
          <span className="ml-auto">&copy; {new Date().getFullYear()} Zyphnaro</span>
        </div>
      </footer>
    </div>
  );
}
