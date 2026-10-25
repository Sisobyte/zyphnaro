"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sourceRepository } from "@/lib/repositories";

export function useSources() {
  return useQuery({ queryKey: ["sources"], queryFn: () => sourceRepository.getSources() });
}

export function useToggleSource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sourceRepository.toggleConnection(id),
    // Connecting/disconnecting a source changes which opportunities the user
    // sees, so every query derived from the opportunity pool is refreshed too.
    onSuccess: () =>
      Promise.all(
        ["sources", "opportunities", "match-distribution", "strong-match-count", "skill-demand"].map((key) =>
          client.invalidateQueries({ queryKey: [key] })
        )
      ),
  });
}
