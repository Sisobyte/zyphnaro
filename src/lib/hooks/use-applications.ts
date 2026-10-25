"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationRepository } from "@/lib/repositories";
import type { Application, ApplicationStage } from "@/lib/types";

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationRepository.getApplications(),
  });
}

export function useMoveApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ApplicationStage }) =>
      applicationRepository.moveApplication(id, stage),

    // Optimistic: the card lands in its new column the moment it's dropped,
    // rather than snapping back until the server responds.
    onMutate: async ({ id, stage }) => {
      await client.cancelQueries({ queryKey: ["applications"] });
      const previous = client.getQueryData<Application[]>(["applications"]);
      client.setQueryData<Application[]>(["applications"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, stage } : a))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      client.setQueryData(["applications"], context?.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["applications"] }),
  });
}
