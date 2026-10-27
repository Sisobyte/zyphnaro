import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { RealtimeListener } from "./realtime-listener";
import { ActivityPing } from "./activity-ping";
import { SiteBanner } from "./site-banner";

export function AppShell({ children, banner }: { children: React.ReactNode; banner?: { text: string; level: "info" | "warning" } | null }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-z-surface">
      <RealtimeListener />
      <ActivityPing />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {banner && <SiteBanner text={banner.text} level={banner.level} />}
        <TopBar />
        <MobileHeader />
        <main className="z-scroll-light flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
