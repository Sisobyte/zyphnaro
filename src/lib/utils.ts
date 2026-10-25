import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function formatSalary(salary?: {
  min?: number;
  max?: number;
  currency?: string;
  period?: string;
}): string | null {
  if (!salary || (!salary.min && !salary.max)) return null;
  const currency = salary.currency ?? "USD";
  const symbol = currency === "USD" ? "$" : currency + " ";
  const fmt = (n: number) => `${symbol}${n.toLocaleString()}`;
  const period = salary.period ? `/${salary.period}` : "";
  if (salary.min && salary.max) return `${fmt(salary.min)}–${fmt(salary.max)}${period}`;
  if (salary.min) return `From ${fmt(salary.min)}${period}`;
  if (salary.max) return `Up to ${fmt(salary.max)}${period}`;
  return null;
}
