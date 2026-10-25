# AI Integration Guide

## Status: real today (Gemini)

Add these two lines to `.env.local` and every AI module below goes live automatically —
no other code changes needed:

```env
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.5-flash
```

`GEMINI_MODEL` is deliberately a swappable env var rather than a hardcoded string —
Google's free-tier model availability shifts, so if a given model isn't available on
your plan, change this one line and restart, no code edits required.

`aiService` (`src/lib/services/ai/index.ts`) resolves to `GeminiAIService` the moment
`GEMINI_API_KEY` is set, `MockAIService` otherwise — the exact same on/off pattern used
for Supabase throughout the rest of the app.

**What's real now, and where to find it in the UI:**

| Module | Where | Notes |
|---|---|---|
| CV Analyzer | `/cv-analyzer` → "Analyze for a specific job" | If a real CV is on file (Phase 3), the actual PDF is fetched server-side from Storage and sent to Gemini natively — no separate text-extraction library needed, Gemini reads PDFs directly. |
| Opportunity Analyzer | Opportunity detail → AI Analysis tab → **"Live AI Analysis"** panel | This is a new addition — the tab previously only showed static seeded content with no way to trigger a real call. |
| CV Tailor | Opportunity detail → CV Fit tab → **"Generate Tailored CV with AI"** panel | Also new. This is a live, on-demand preview only — not saved anywhere yet. Persisting a history of tailored CVs would need a `tailored_cvs` table (a Phase-2-style addition), not built in this pass. |
| Recruiter Message Generator | Opportunity detail → Recruiter tab | Also fixed to use the real signed-in user's name/headline instead of the hardcoded mock user. |
| Interview Question Generator + Answer Evaluator | `/interview-practice/session` | Shipped together since they're used in the same session. Questions now genuinely adapt to real answers instead of cycling a fixed bank. |

**Architecture, for anyone extending this:** every module is called from a server-side
`/api/*` route handler — `GeminiAIService` is never imported into a client component,
so the API key never reaches the browser. Every response is parsed as JSON and
validated against a Zod schema (`src/lib/services/ai/schemas.ts`) before being
returned to the client; a malformed model response throws rather than silently
reaching the UI as if it were trustworthy.

**Known limitation, stated plainly:** this development sandbox cannot reach Google's
API to exercise a live call end-to-end. The code passed a full TypeScript compile
against the real `@google/genai` SDK's published types (a meaningful signal the call
shapes — `ai.models.generateContent`, `response.text`, etc. — are structurally
correct), and the mock-mode fallback path was verified working end to end, but the
actual live Gemini round-trip has not been executed by anyone yet. If a specific model
name returns an error, the API route's error message will say so — swap
`GEMINI_MODEL` and retry.

---

Every AI-powered feature in Zyphnaro goes through one interface: `AIService`
(`src/lib/types/ai.ts`). The UI calls `aiService` from `src/lib/services/ai/index.ts`,
which today points at `MockAIService`. This document explains each AI module and how to
wire up a real provider without touching any component.

## The golden rule

**Never call an AI provider directly from the browser, and never put an API key in a
React component, client-side JavaScript, or a `NEXT_PUBLIC_` environment variable.**
Every real AI call must happen in a server-side API route (see `/api/ai/*` in
`src/app/api`), which reads the key from a server-only environment variable.

```
Frontend → POST /api/ai/analyze-opportunity → server AIService → provider → JSON → Zod → frontend
```

## The 10 AI modules

| # | Module | Input | Output | Used by |
|---|--------|-------|--------|---------|
| 1 | Opportunity Analyzer | job description, required skills, user profile | match score, summary, strengths, concerns | Opportunity Detail → AI Analysis tab |
| 2 | Skill Extractor | raw job description text | normalized skill list | Source ingestion pipeline (not yet wired to UI) |
| 3 | Match Analyzer | candidate skills/experience vs. role | skills/experience/role/location sub-scores | `lib/engines/match-engine.ts` |
| 4 | Trust Analyzer | company/domain/recruiter/payment signals | trust score, level, signals, concerns | `lib/engines/trust-engine.ts` |
| 5 | CV Analyzer | CV skills/experience, optional target job | score, ATS compatibility, missing/strong keywords | CV Analyzer page |
| 6 | CV Tailor | CV skills, target job skills | highlighted skills, recommended changes, summary | Tailored CV pages |
| 7 | Recruiter Message Generator | recruiter, opportunity, user profile, channel | message text | Opportunity Detail → Recruiter tab |
| 8 | Interview Question Generator | mode, difficulty, role, turn count | one question at a time | Interview session |
| 9 | Interview Answer Evaluator | question + answer | strength, feedback, follow-up flag | Interview session |
| 10 | Interview Coach | full session transcript | readiness breakdown, strengths, weak areas | `lib/interview-results.ts` (currently computed client-side from evaluations) |

## Example request/response

**POST `/api/ai/analyze-opportunity`**

```json
// request
{
  "opportunityTitle": "Junior React Developer",
  "opportunityDescription": "...",
  "requiredSkills": ["React", "TypeScript", "Tailwind CSS"],
  "userSkills": ["React", "TypeScript", "JavaScript"],
  "userSeniority": "junior"
}
```

```json
// response
{
  "result": {
    "matchScore": 92,
    "summary": "This role asks for React, TypeScript, Tailwind CSS.",
    "requiredSkills": ["React", "TypeScript", "Tailwind CSS"],
    "preferredSkills": [],
    "strengths": ["React", "TypeScript"],
    "concerns": ["Missing from your profile: Tailwind CSS"],
    "recommendedActions": ["Consider adding a project that demonstrates Tailwind CSS"]
  }
}
```

## Implementing a real provider

1. Create `src/lib/services/ai/anthropic-ai-service.ts` (or `openai-ai-service.ts`,
   `gemini-ai-service.ts`) implementing `AIService`.
2. Each method should call the provider's API **from server-side code only** — either
   directly inside the corresponding `/api/ai/*` route handler, or from a service class
   instantiated inside that route handler.
3. Prompt the model to return **JSON only**, then parse and validate with a Zod schema
   matching the relevant `*Result` type in `src/lib/types/ai.ts`. Never trust an AI
   response blindly — if validation fails, fall back gracefully (see error handling
   below) rather than passing malformed data to the UI.
4. Swap the export in `src/lib/services/ai/index.ts`:

   ```ts
   export const aiService: AIService = new AnthropicAIService();
   ```

## Cross-cutting concerns

- **Retries**: wrap provider calls with a small retry-with-backoff helper for
  transient failures (timeouts, 429s).
- **Error handling**: if the provider call fails or returns invalid JSON, return a
  clear error to the client (e.g. `{ error: "analysis-unavailable" }`) so the UI can
  show a friendly message instead of crashing.
- **Rate limiting**: rate-limit `/api/ai/*` routes per user to control cost and abuse.
- **Token/cost management**: log token usage per request; consider caching
  `analyzeOpportunity` results per opportunity+user pair since they don't change often.
- **Fallback provider strategy**: consider a secondary provider (e.g. OpenAI as
  fallback if Anthropic times out) behind the same `AIService` interface.
- **Structured output validation**: every `*Result` type in `src/lib/types/ai.ts`
  should have a matching Zod schema on the server; reject and retry once if the model's
  JSON doesn't parse or validate.
