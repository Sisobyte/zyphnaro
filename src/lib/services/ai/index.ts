import type { AIService } from "@/lib/types";
import { MockAIService } from "./mock-ai-service";
import { GeminiAIService } from "./gemini-ai-service";
import { isGeminiConfigured } from "./config";

// AI INTEGRATION:
// Real the moment GEMINI_API_KEY is set (see .env.example), mock otherwise
// — same on/off pattern used throughout for Supabase. This module is
// imported by API routes ONLY; never import it from a client component,
// since GeminiAIService reads a server-only env var.
// See /docs/ai-integration.md
export const aiService: AIService = isGeminiConfigured ? new GeminiAIService() : new MockAIService();
