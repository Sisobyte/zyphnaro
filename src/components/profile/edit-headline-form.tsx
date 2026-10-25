"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/types";

const schema = z.object({
  headline: z.string().min(10, "Headline should be at least 10 characters").max(120, "Keep it under 120 characters"),
});

type FormValues = z.infer<typeof schema>;

export function EditHeadlineForm({
  user,
  onSave,
}: {
  user: UserProfile;
  onSave: (headline: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { headline: user.headline },
  });

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-z-ink-soft">{user.headline}</p>
        <button
          onClick={() => setEditing(true)}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-z-brand hover:underline"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
    );
  }

  const submit = handleSubmit(async (values) => {
    // BACKEND INTEGRATION:
    // Replace this mock service with the Supabase/API implementation.
    // PATCH /profiles/:id { headline } — see /docs/backend-integration.md
    await new Promise((r) => setTimeout(r, 300));
    onSave(values.headline);
    setEditing(false);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Input {...register("headline")} />
      {errors.headline && <p className="text-xs text-z-danger">{errors.headline.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setEditing(false);
          }}
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </form>
  );
}
