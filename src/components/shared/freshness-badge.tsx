import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { Flame } from "lucide-react";

export function FreshnessBadge({ postedAt }: { postedAt: string }) {
  // eslint-disable-next-line react-hooks/purity -- freshness is computed against wall-clock time for this mock dataset
  const minutes = (Date.now() - new Date(postedAt).getTime()) / 60000;
  const isFresh = minutes < 60;
  return (
    <Badge variant={isFresh ? "warning" : "neutral"} className="font-normal">
      {isFresh && <Flame className="h-3 w-3" />}
      Posted {timeAgo(postedAt)}
    </Badge>
  );
}
