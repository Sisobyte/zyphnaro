import { cn } from "@/lib/utils";

export function Avatar({
  url,
  initials,
  className,
}: {
  url?: string;
  initials: string;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("h-full w-full rounded-full object-cover", className)} />;
  }
  return <span className={cn("flex h-full w-full items-center justify-center rounded-full", className)}>{initials}</span>;
}
