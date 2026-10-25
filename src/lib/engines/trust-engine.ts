// Mock trust engine.
//
// In production this module evaluates company identity, official domain
// ownership, recruiter identity consistency, application URL matching,
// email domain, suspicious payment requests, urgency language,
// compensation realism, external link safety, source reputation and
// user reports. It never definitively labels a listing a scam — only
// "low-concern", "potential-concern", or "high-risk" based on signals.

export interface TrustSignalInput {
  hasVerifiedDomain: boolean;
  applicationUrlMatchesDomain: boolean;
  recruiterIdentityConsistent: boolean;
  requestsPaymentOrBankDetails: boolean;
  usesUrgentLanguage: boolean;
  compensationSeemsUnrealistic: boolean;
}

export interface TrustOutput {
  score: number;
  level: "low-concern" | "potential-concern" | "high-risk";
  signals: string[];
  concerns: string[];
}

export function computeTrust(input: TrustSignalInput): TrustOutput {
  let score = 100;
  const signals: string[] = [];
  const concerns: string[] = [];

  if (input.hasVerifiedDomain) {
    signals.push("Official company domain");
  } else {
    score -= 15;
    concerns.push("No official company domain found");
  }

  if (input.applicationUrlMatchesDomain) {
    signals.push("Application URL matches company domain");
  }

  if (input.recruiterIdentityConsistent) {
    signals.push("Recruiter identity appears consistent");
  } else {
    score -= 10;
    concerns.push("Recruiter identity could not be confirmed");
  }

  if (input.requestsPaymentOrBankDetails) {
    score -= 45;
    concerns.push("Requests payment details before work begins");
  } else {
    signals.push("No payment request detected");
  }

  if (input.usesUrgentLanguage) {
    score -= 15;
    concerns.push("Unusual urgency in the listing language");
  }

  if (input.compensationSeemsUnrealistic) {
    score -= 10;
    concerns.push("Compensation is unusually high for the listed level");
  }

  score = Math.max(0, Math.min(100, score));

  const level: TrustOutput["level"] =
    score >= 80 ? "low-concern" : score >= 50 ? "potential-concern" : "high-risk";

  return { score, level, signals, concerns };
}
