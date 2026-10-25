"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingCard({
  name,
  price,
  period,
  features,
  highlighted,
  included,
}: {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  /** The plan everyone has today. Paid plans show "Coming soon". */
  included?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-6",
        highlighted && "border-z-brand shadow-lg ring-1 ring-z-brand/20"
      )}
    >
      {highlighted && (
        <span className="w-fit rounded-full bg-z-brand-50 px-2.5 py-0.5 text-xs font-semibold text-z-brand-600">
          Most popular
        </span>
      )}
      <div>
        <h3 className="text-lg font-semibold text-z-ink">{name}</h3>
        <p className="mt-1 text-3xl font-semibold text-z-ink">
          {price}
          {period && <span className="text-sm font-normal text-z-ink-faint">/{period}</span>}
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-z-ink-soft">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-z-success" /> {f}
          </li>
        ))}
      </ul>
      <Button variant="secondary" disabled className="w-full">
        {included ? "Included for everyone" : "Coming soon"}
      </Button>
    </Card>
  );
}
