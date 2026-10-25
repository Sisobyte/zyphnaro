"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationRepository } from "@/lib/repositories";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationRepository.getNotifications(),
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationRepository.markAsRead(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => notificationRepository.markAllAsRead(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
