import { ExternalLink, Globe } from "lucide-react";
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
      <SidebarInset className="bg-background/50">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/80 px-4 sm:px-6 sticky top-0 z-40 bg-background/90 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs" />
            <div className="h-4 w-px bg-border/70 hidden sm:block" />
            <Link
              href="/"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-muted"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">View Public Website</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
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
