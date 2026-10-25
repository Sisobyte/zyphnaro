// AI INTEGRATION:
// Replace mock question bank with the configured AI provider's
// generateInterviewQuestion output. See /docs/ai-integration.md
// The MockAIService below cycles through this bank instead of calling
// a real model, so the practice flow works fully offline.

import type { InterviewQuestion } from "@/lib/types";

export const mockInterviewQuestions: Record<string, InterviewQuestion[]> = {
  technical: [
    {
      id: "t-1",
      category: "React fundamentals",
      prompt: "Can you explain what happens when a user clicks a button in a React application?",
      followUp: "What would change if that click handler also updated state used by a child component?",
    },
    {
      id: "t-2",
      category: "State management",
      prompt: "How do you decide whether a piece of state belongs in a component versus being lifted up?",
    },
    {
      id: "t-3",
      category: "Performance",
      prompt: "What are some ways you'd investigate a React app that feels slow when typing into a form?",
    },
    {
      id: "t-4",
      category: "TypeScript",
      prompt: "Walk me through how you'd type a component prop that can either be a string or a function returning a string.",
    },
    {
      id: "t-5",
      category: "CSS & layout",
      prompt: "How would you build a responsive card grid that reflows from 3 columns to 1 column on mobile?",
    },
  ],
  behavioral: [
    {
      id: "b-1",
      category: "Conflict resolution",
      prompt: "Tell me about a time you disagreed with a teammate about a technical decision. What did you do?",
    },
    {
      id: "b-2",
      category: "Ownership",
      prompt: "Describe a project where you had to figure things out with minimal direction.",
    },
    {
      id: "b-3",
      category: "Feedback",
      prompt: "Tell me about a time you received tough feedback on your code or work. How did you respond?",
    },
  ],
  "role-focused": [
    {
      id: "r-1",
      category: "Frontend craft",
      prompt: "What does 'good frontend code' mean to you, beyond just working correctly?",
    },
    {
      id: "r-2",
      category: "Collaboration",
      prompt: "How do you typically work with designers when a Figma file doesn't cover every edge case?",
    },
  ],
  company: [
    {
      id: "c-1",
      category: "Motivation",
      prompt: "Why are you interested in this company specifically, beyond the tech stack?",
    },
    {
      id: "c-2",
      category: "Product sense",
      prompt: "If you used our product today, what's one thing you'd improve and why?",
    },
  ],
  "full-mock": [
    {
      id: "f-1",
      category: "Warm-up",
      prompt: "Tell me a bit about yourself and what you've been working on recently.",
    },
    {
      id: "f-2",
      category: "Technical",
      prompt: "Walk me through how you'd approach building a paginated list of items from an API.",
    },
    {
      id: "f-3",
      category: "Behavioral",
      prompt: "Tell me about a time a project didn't go as planned. What did you learn?",
    },
    {
      id: "f-4",
      category: "Closing",
      prompt: "What questions do you have for me about the role or the team?",
    },
  ],
};
