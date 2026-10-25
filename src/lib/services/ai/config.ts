// Central place to check whether a real Gemini API key is configured.
// While this returns false, aiService (see ./index.ts) stays MockAIService,
// so every AI feature keeps working offline with no setup.

export const geminiApiKey = process.env.GEMINI_API_KEY;
export const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export const isGeminiConfigured = Boolean(geminiApiKey);
