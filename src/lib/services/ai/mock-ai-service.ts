// AI INTEGRATION:
// This is the mock implementation of the AIService interface. Every AI
// feature in the app calls this class today. Replace it with a real
// provider implementation (AnthropicAIService, OpenAIService,
// GeminiAIService) that calls a server-side API route — never call an
// AI provider directly from the browser. See /docs/ai-integration.md
//
// The UI imports `aiService` from ./index and never this class directly,
// so swapping providers never touches a component.

import { isNonAnswer, NON_ANSWER_EVALUATION, strengthFromScore } from "@/lib/interview-scoring";
import type {
  AIService,
  CVAIInput,
  CVAIResult,
  CVExtractionInput,
  CVExtractionResult,
  InterviewAnswerInput,
  InterviewQuestionInput,
  OpportunityAIResult,
  RecruiterMessageInput,
  TailorCVInput,
  TailoredCVResult,
} from "@/lib/types";
import type { InterviewEvaluation, InterviewQuestion } from "@/lib/types";
import { mockInterviewQuestions } from "@/lib/mock/interviews";

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockAIService implements AIService {
  async analyzeOpportunity(): Promise<OpportunityAIResult> {
    await delay();
    // No AI provider is configured, so there is no reasoning to add. Return an
    // explicit empty result instead of inventing analysis; the UI says the AI
    // part is unavailable and the rule-based assessment stays as it is.
    return { provider: "none", summary: "", insights: [], recruiterQuestions: [], disagreements: [] };
  }

  async analyzeCV(input: CVAIInput): Promise<CVAIResult> {
    await delay();
    const target = input.targetOpportunitySkills ?? [];
    const covered = target.filter((s) =>
      input.cvSkills.map((x) => x.toLowerCase()).includes(s.toLowerCase())
    );
    const missing = target.filter((s) => !covered.includes(s));
    const score = target.length ? Math.round((covered.length / target.length) * 100) : 78;
    return {
      score,
      atsCompatibility: Math.min(95, score + 5),
      missingKeywords: missing,
      strongKeywords: covered.length ? covered : input.cvSkills.slice(0, 5),
      feedback: [
        "Lead your summary with the skills this role asks for first.",
        missing.length
          ? `Add a project or line item that demonstrates ${missing[0]}.`
          : "Your listed skills already cover everything this role asks for.",
      ],
    };
  }

  async tailorCV(input: TailorCVInput): Promise<TailoredCVResult> {
    await delay();
    const highlighted = input.opportunitySkills.filter((s) =>
      input.cvSkills.map((x) => x.toLowerCase()).includes(s.toLowerCase())
    );
    return {
      highlightedSkills: highlighted.length ? highlighted : input.cvSkills.slice(0, 4),
      recommendedChanges: [
        `Lead your summary with ${highlighted[0] ?? input.cvSkills[0]}, matching the job's top requirement.`,
        `Reorder your skills section so ${highlighted.slice(0, 3).join(", ") || "your top skills"} appear first.`,
        "Quantify your most relevant project with a concrete outcome.",
      ],
      projectRecommendations: [],
      summary: `Frontend developer with hands-on experience in ${highlighted.slice(0, 3).join(", ") || input.cvSkills.slice(0, 3).join(", ")}.`,
    };
  }

  async generateRecruiterMessage(input: RecruiterMessageInput): Promise<string> {
    await delay(400);
    if (input.channel === "email") {
      return `Subject: Application for ${input.opportunityTitle}\n\nHi ${input.recruiterName},\n\nI'm ${input.userName}, ${input.userHeadline}. I just applied for the ${input.opportunityTitle} role at ${input.company} and wanted to introduce myself directly. I'd love the chance to talk through how my background fits what your team is building.\n\nLooking forward to hearing from you.\n\nBest,\n${input.userName}`;
    }
    if (input.channel === "linkedin") {
      return `Hi ${input.recruiterName}, I'm ${input.userName} — ${input.userHeadline}. I saw the ${input.opportunityTitle} opening at ${input.company} and just applied. Would love to connect and share more about my background if it's useful.`;
    }
    return `Hey! Just applied for ${input.opportunityTitle} at ${input.company} — excited about it. Let me know if you need anything else from me.`;
  }

  async generateInterviewQuestion(input: InterviewQuestionInput): Promise<InterviewQuestion> {
    await delay(600);
    const bank = mockInterviewQuestions[input.mode] ?? mockInterviewQuestions.technical;
    const question = bank[input.previousTurns % bank.length];
    if (input.lastAnswerWasWeak && question.followUp) {
      return {
        ...question,
        id: question.id + "-followup",
        prompt: question.followUp,
      };
    }
    return question;
  }

  async evaluateInterviewAnswer(input: InterviewAnswerInput): Promise<InterviewEvaluation> {
    await delay(500);
    if (isNonAnswer(input.answer)) return NON_ANSWER_EVALUATION;
    // MOCK MODE: no real grading is possible without the AI provider, so this
    // only looks at length and stays conservative. Real marks need GEMINI_API_KEY.
    const length = input.answer.trim().length;
    const score = length > 400 ? 70 : length > 220 ? 58 : length > 80 ? 42 : 25;
    return {
      score,
      strength: strengthFromScore(score),
      dimensions: { technical: score, communication: score, problemSolving: score, roleKnowledge: score },
      feedback: "Demo mode: this mark is based on answer length only. Connect the AI provider for real grading.",
      followUpTriggered: score < 60 && Boolean(input.question.followUp),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extractProfileFromCV(_input: CVExtractionInput): Promise<CVExtractionResult> {
    await delay(600);
    // MOCK MODE: can't actually read the file — returns a plausible
    // placeholder so the onboarding flow can be exercised end to end
    // without a real AI provider configured.
    return {
      suggestedRole: "Frontend Developer",
      skills: ["React", "TypeScript", "JavaScript", "Tailwind CSS", "Git"],
      summary: "Mock extraction — connect a real AI provider to read the actual uploaded file.",
      yearsExperience: 2,
      experience: [
        {
          title: "Frontend Developer",
          company: "Mock Company",
          startDate: "2023-01",
          description: "Mock extraction — connect a real AI provider to read your actual work history.",
          skills: ["React", "TypeScript"],
        },
      ],
      projects: [
        {
          name: "Mock Project",
          description: "Mock extraction — connect a real AI provider to read your actual projects.",
          skills: ["React"],
        },
      ],
      education: [
        {
          school: "Mock University",
          credential: "Mock extraction — connect a real AI provider",
          startYear: "2019",
          endYear: "2023",
        },
      ],
    };
  }
}