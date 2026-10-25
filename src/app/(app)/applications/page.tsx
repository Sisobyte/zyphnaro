"use client";

import { KanbanSquare } from "lucide-react";
import { ApplicationKanban } from "@/components/applications/application-kanban";
import { useApplications } from "@/lib/hooks/use-applications";

export default function ApplicationsPage() {
  const { data: applications = [] } = useApplications();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <KanbanSquare className="h-5 w-5 text-z-brand" /> My Applications
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">
          {applications.length} applications tracked · drag a card or use Move to change its stage.
        </p>
      </div>

      <ApplicationKanban />
    </div>
  );
}
