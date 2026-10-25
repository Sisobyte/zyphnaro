import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  Star,
  Compass,
  UserCircle,
  ScanSearch,
  FileEdit,
  TrendingUp,
  KanbanSquare,
  MessagesSquare,
  Bell,
  Plug,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Opportunity Radar",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Opportunities", href: "/opportunities", icon: Radar },
      { label: "My Matches", href: "/matches", icon: Star },
      { label: "Role Explorer", href: "/role-explorer", icon: Compass },
    ],
  },
  {
    label: "Career",
    items: [
      { label: "CV & Profile", href: "/profile", icon: UserCircle },
      { label: "CV Analyzer", href: "/cv-analyzer", icon: ScanSearch },
      { label: "Tailored CVs", href: "/tailored-cvs", icon: FileEdit },
      { label: "Skill Gaps", href: "/skill-gaps", icon: TrendingUp },
    ],
  },
  {
    label: "Applications",
    items: [
      { label: "Applications", href: "/applications", icon: KanbanSquare },
      { label: "Interview Practice", href: "/interview-practice", icon: MessagesSquare },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Sources", href: "/sources", icon: Plug },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
