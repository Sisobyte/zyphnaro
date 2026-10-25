// BACKEND INTEGRATION:
// Replace this mock service with the Supabase/API implementation.
// See /docs/backend-integration.md
//
// This module holds the single mock user used throughout the prototype.
// In production this becomes a row in `profiles`, joined with `skills`,
// `roles`, and `experience` tables — see /docs/database-schema.md.

import type { UserProfile } from "@/lib/types";

export const mockUser: UserProfile = {
  id: "user-clinton",
  name: "Clinton Ejiogu",
  headline: "Frontend Developer building fast, accessible web apps",
  avatarInitials: "CE",
  primaryRole: "Frontend Developer",
  seniority: "junior",
  yearsExperience: 2,
  relatedRoles: [
    {
      title: "React Developer",
      relation: "related",
      overlapPercent: 95,
      reason: "Your React + TypeScript experience overlaps almost completely with this role.",
    },
    {
      title: "Web Developer",
      relation: "related",
      overlapPercent: 90,
      reason: "Core HTML, CSS and JavaScript skills transfer directly.",
    },
    {
      title: "UI Engineer",
      relation: "related",
      overlapPercent: 85,
      reason: "Your component-driven Tailwind work matches UI engineering expectations.",
    },
    {
      title: "JavaScript Developer",
      relation: "related",
      overlapPercent: 88,
      reason: "JavaScript is the common foundation across both roles.",
    },
    {
      title: "Junior Software Engineer",
      relation: "related",
      overlapPercent: 78,
      reason: "General engineering fundamentals from your projects carry over.",
    },
    {
      title: "Backend Developer",
      relation: "adjacent",
      overlapPercent: 45,
      reason: "You've used Supabase and REST APIs, but most of your depth is on the client.",
    },
    {
      title: "Mobile Developer",
      relation: "adjacent",
      overlapPercent: 38,
      reason: "React knowledge transfers partially to React Native, but you have no mobile projects yet.",
    },
    {
      title: "QA Engineer",
      relation: "adjacent",
      overlapPercent: 30,
      reason: "You write code that needs testing, but no dedicated QA experience is listed.",
    },
    {
      title: "DevOps Engineer",
      relation: "adjacent",
      overlapPercent: 22,
      reason: "Minimal overlap — mostly through Git and deployment familiarity.",
    },
  ],
  skills: [
    "React",
    "TypeScript",
    "JavaScript",
    "Tailwind CSS",
    "Next.js",
    "Supabase",
    "Git",
    "REST APIs",
    "HTML",
    "CSS",
  ],
  experience: [
    {
      id: "exp-1",
      title: "Frontend Developer",
      company: "Sommy Auto Parts",
      startDate: "2024-03",
      description:
        "Built responsive product and checkout flows in React and TypeScript, and integrated a Supabase backend for inventory and orders.",
      skills: ["React", "TypeScript", "Supabase", "Tailwind CSS"],
    },
    {
      id: "exp-2",
      title: "Junior Web Developer",
      company: "Freelance",
      startDate: "2023-06",
      endDate: "2024-02",
      description:
        "Delivered marketing sites and small web apps for local businesses, handling everything from layout to deployment.",
      skills: ["JavaScript", "HTML", "CSS", "Git"],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "RunAm",
      description: "A ride-coordination app concept with a React front end and real-time trip status updates.",
      skills: ["React", "TypeScript", "Supabase"],
      url: "https://github.com/clinton-ejiogu/runam",
    },
    {
      id: "proj-2",
      name: "Sommy Auto Parts Platform",
      description: "An e-commerce platform for auto parts with search, filtering and a Supabase-backed catalog.",
      skills: ["Next.js", "Tailwind CSS", "Supabase", "REST APIs"],
      url: "https://github.com/clinton-ejiogu/sommy-auto-parts",
    },
    {
      id: "proj-3",
      name: "Stitch Flow",
      description: "A component playground for rapidly prototyping UI patterns with reusable Tailwind primitives.",
      skills: ["React", "Tailwind CSS", "JavaScript"],
      url: "https://github.com/clinton-ejiogu/stitch-flow",
    },
  ],
  education: [
    {
      id: "edu-1",
      school: "University of Benue",
      credential: "B.Sc. Computer Science",
      startYear: "2019",
      endYear: "2023",
    },
  ],
  location: "Makurdi, Benue State, Nigeria",
  preferredLocations: ["Remote", "Lagos, Nigeria"],
  remotePreference: "remote-first",
  employmentTypes: ["full-time", "contract"],
  salaryExpectation: { min: 1200, max: 2200, currency: "USD", period: "month" },
  portfolioUrl: "https://clintonejiogu.dev",
  githubUrl: "https://github.com/clinton-ejiogu",
  linkedinUrl: "https://linkedin.com/in/clinton-ejiogu",
  availability: "Available immediately",
  cvScore: 78,
  minMatchScore: 80,
  cvFileName: "Clinton_Ejiogu_CV.pdf",
  cvUploadedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  plan: "free",
};