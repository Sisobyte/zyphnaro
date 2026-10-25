"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tailoredCVRepository } from "@/lib/repositories";
import type { CreateTailoredCVInput } from "@/lib/repositories";

export function useTailoredCVs() {
  return useQuery({
    queryKey: ["tailored-cvs"],
    queryFn: () => tailoredCVRepository.getTailoredCVs(),
  });
}

export function useTailoredCV(id: string) {
  return useQuery({
    queryKey: ["tailored-cv", id],
    queryFn: () => tailoredCVRepository.getTailoredCVById(id),
    enabled: Boolean(id),
  });
}

export function useSaveTailoredCV() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTailoredCVInput) => tailoredCVRepository.createTailoredCV(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tailored-cvs"] });
    },
  });
}
