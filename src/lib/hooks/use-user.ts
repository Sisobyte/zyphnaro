"use client";

import { useQuery } from "@tanstack/react-query";
import { userRepository } from "@/lib/repositories";

export function useCurrentUser() {
  return useQuery({ queryKey: ["current-user"], queryFn: () => userRepository.getCurrentUser() });
}
