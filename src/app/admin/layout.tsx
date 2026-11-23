import { ExternalLink, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RouteTracker } from "@/components/admin/route-tracker";
import { UserNav } from "@/components/admin/user-nav";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { verifyAdmin } from "@/lib/auth-utils";

export const instant = false;

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  await verifyAdmin(true);

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
      <AdminSidebar />
      <SidebarInset className="bg-stone-50/60 min-h-screen">
        {/* Colorful Modern Admin Header matching website Saffron theme */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6 sticky top-0 z-40 bg-linear-to-r from-orange-600 via-amber-600 to-orange-700 text-white shadow-md border-b border-white/20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 rounded-lg bg-white/15 border border-white/25 text-white hover:bg-white/25 hover:text-white cursor-pointer shadow-xs transition-all" />
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 animate-pulse hidden sm:block" />
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-heading">
                Admin Portal <span className="text-amber-200/90 text-xs font-normal hidden md:inline">• Control Center</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs font-semibold text-white/95 hover:text-white flex items-center gap-1.5 transition-all py-1.5 px-3 rounded-full bg-white/15 border border-white/25 hover:bg-white/25 backdrop-blur-xs shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">View Public Website</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <UserNav />
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
