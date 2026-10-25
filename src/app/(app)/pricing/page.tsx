"use client";

import { CreditCard, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PricingCard } from "@/components/pricing/pricing-card";

// PAYMENT INTEGRATION:
// Future integration can use Stripe, Paystack, Flutterwave, or another
// supported payment provider.
// Do not implement real payments in this prototype.

export default function PricingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="text-center">
        <h1 className="inline-flex items-center justify-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <CreditCard className="h-5 w-5 text-z-brand" /> Plans & Pricing
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Plans we&apos;re planning for people at every stage of their job search.</p>
      </div>

      <Card className="flex items-center gap-2.5 p-4 text-sm text-z-ink-soft">
        <Info className="h-4 w-4 shrink-0 text-z-brand" /> Paid plans are coming soon. Nothing is charged and no payment details are needed right now.
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <PricingCard
          name="Free"
          price="$0"
          included
          features={[
            "Basic opportunity discovery",
            "Basic matching",
            "Limited CV analysis",
            "Application tracking",
            "Limited interview practice",
          ]}
        />
        <PricingCard
          name="Pro"
          price="$19"
          period="month"
          highlighted
          features={[
            "Advanced matching",
            "Act Now alerts",
            "Deep CV analysis",
            "Tailored CVs",
            "Advanced trust analysis",
            "Unlimited interview practice",
            "Recruiter intelligence",
          ]}
        />
        <PricingCard
          name="Career Agent"
          price="$49"
          period="month"
          features={[
            "Everything in Pro",
            "Continuous opportunity monitoring",
            "Personalized opportunity agent",
            "Priority alerts",
            "Advanced career intelligence",
            "Personalized preparation",
          ]}
        />
      </div>
    </div>
  );
}
