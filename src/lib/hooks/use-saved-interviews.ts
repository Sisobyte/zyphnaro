"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedInterviewRepository } from "@/lib/repositories";
import type { SaveInterviewInput } from "@/lib/repositories";

export function useSavedInterviews() {
  return useQuery({ queryKey: ["saved-interviews"], queryFn: () => savedInterviewRepository.list() });
}

export function useSavedInterview(id: string) {
  return useQuery({
    queryKey: ["saved-interview", id],
    queryFn: () => savedInterviewRepository.getById(id),
    enabled: Boolean(id),
  });
}

export function useSaveInterview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInterviewInput) => savedInterviewRepository.save(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["saved-interviews"] }),
  });
}

export function useDeleteSavedInterview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedInterviewRepository.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["saved-interviews"] }),
  });
}
