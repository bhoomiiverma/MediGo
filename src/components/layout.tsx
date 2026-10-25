import { useAuth } from "@/store/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { DemoBanner } from "@/components/layout/demo-banner";

interface LayoutProps {
  children: React.ReactNode;
  signOut: () => Promise<void>;
}

export function Layout({ children, signOut }: LayoutProps) {
  const { profile, facility, demoMode } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <DemoBanner demoMode={demoMode} />
      <Sidebar profile={profile!} facility={facility!} onSignOut={() => signOut()} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar profile={profile!} facility={facility!} onSignOut={() => signOut()} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
