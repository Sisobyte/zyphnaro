// Realistic listings and candidate profiles used across the assessment tests.
import type { CandidateInput } from "../candidate-evidence";
import type { AssessJobInput } from "../job-assessment";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";

export function job(title: string, seniority: AssessJobInput["seniority"], description: string): AssessJobInput {
  return { title, seniority, description, skills: extractSkillsFromText(`${title}. ${description}`, 20) };
}

export const JUNIOR_GENUINE = job(
  "Junior Frontend Developer",
  "junior",
  `About the role: You will join our product team and build user interfaces with React and TypeScript under the guidance of senior engineers. You will receive mentorship from senior engineers and pair with them weekly. Requirements: Basic knowledge of React, HTML and CSS. Familiarity with Git. Nice to have: Experience with Next.js or Figma. 0-2 years of experience. We offer a learning budget and a friendly team.`
);

export const JUNIOR_LABEL_SENIOR_DUTIES = job(
  "Junior Software Engineer",
  "junior",
  `Responsibilities: Own the architecture across our payment systems and define the technical strategy for the platform. Mentor junior engineers and manage a team of four developers. Set engineering standards across the organization. Requirements: 6+ years of experience building distributed systems with Node.js, PostgreSQL and AWS. Nice to have: Kafka. Benefits: remote work.`
);

export const SENIOR_BACKEND_ARCHITECT = job(
  "Senior Backend Architect",
  "senior",
  `Responsibilities: Own the architecture across our services and lead the technical roadmap. Mentor engineers and drive company-wide standards. Requirements: 8+ years of experience with Node.js, PostgreSQL, Kafka and AWS. Fluent in English. Nice to have: Kubernetes. Candidates must have the right to work in Germany.`
);

const longText = (s: string) => s;

export const FRONTEND_SENIOR: CandidateInput = {
  seniority: "senior",
  skills: ["React", "TypeScript", "CSS", "Next.js", "JavaScript", "Node.js"],
  experience: [
    { title: "Senior Frontend Engineer", description: longText("Built the design system and React component library used by five product teams. Led the migration of a large app to Next.js and TypeScript. Mentored junior developers on code review."), skills: ["React", "TypeScript", "Next.js", "CSS"] },
    { title: "Frontend Developer", description: longText("Developed customer dashboards in React and JavaScript, with a small Node.js service for form handling."), skills: ["React", "JavaScript", "Node.js"] },
  ],
  projects: [],
};

export const JUNIOR_CANDIDATE: CandidateInput = {
  seniority: "junior",
  skills: ["React", "HTML", "CSS", "Git", "TypeScript"],
  experience: [
    { title: "Frontend Intern", description: longText("Built landing pages with React, HTML and CSS and used Git for daily collaboration with the team."), skills: ["React", "HTML", "CSS", "Git"] },
  ],
  projects: [{ name: "Portfolio", description: "Personal site written in TypeScript and React.", skills: ["TypeScript", "React"] }],
};

export const SKILLS_ONLY: CandidateInput = { seniority: "mid", skills: ["React", "Node.js", "PostgreSQL"], experience: [], projects: [] };
export const EMPTY_PROFILE: CandidateInput = { seniority: "mid", skills: [], experience: [], projects: [] };
