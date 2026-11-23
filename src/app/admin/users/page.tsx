"use client";

import { Award, Clock, Flame, Plus, Shield, Users } from "lucide-react";
import Link from "next/link";
import { ActiveUsersTab } from "@/components/admin/users/active-users-tab";
import { useActiveUsers } from "@/components/admin/users/hooks/use-active-users";
import { useWhitelist } from "@/components/admin/users/hooks/use-whitelist";
import { RequestsTab } from "@/components/admin/users/requests-tab";
import { WhitelistTab } from "@/components/admin/users/whitelist-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RequestsPage() {
  const activeUsersHook = useActiveUsers();
  const whitelistHook = useWhitelist();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              User Management & Access Control
            </h1>
            <p className="text-xs text-muted-foreground">
              Review devotee registrations, verify profile updates, and assign ashram & leadership roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9 cursor-pointer text-xs shadow-xs"
          >
            <Link href="/admin/users/new" prefetch={false}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>Add Devotee</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Google-Palette Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {activeUsersHook.activeCount ? activeUsersHook.activeCount.toLocaleString() : "4,576"}
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground">Total Devotees</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-foreground">10</div>
            <div className="text-[11px] font-semibold text-muted-foreground">Administrators</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-foreground">838</div>
            <div className="text-[11px] font-semibold text-muted-foreground">Leaders & Mentors</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-foreground">1,456</div>
            <div className="text-[11px] font-semibold text-muted-foreground">Monks & Brahmacaris</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="flex flex-wrap p-1.5 bg-muted/40 border border-border/80 rounded-2xl w-fit gap-1 shadow-2xs">
          <TabsTrigger
            value="active"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <span>Active Users</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600">
              {activeUsersHook.activeCount ? activeUsersHook.activeCount.toLocaleString() : "4,576"}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="requests"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending Requests</span>
          </TabsTrigger>

          <TabsTrigger
            value="whitelist"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span>Whitelisted</span>
            {whitelistHook.whitelistCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600">
                {whitelistHook.whitelistCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Users Tab */}
        <TabsContent value="active" className="space-y-4 outline-none">
          <ActiveUsersTab activeUsersHook={activeUsersHook} />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4 outline-none">
          <RequestsTab onStatusUpdated={activeUsersHook.invalidate} />
        </TabsContent>

        {/* Whitelist Tab */}
        <TabsContent value="whitelist" className="space-y-4 outline-none">
          <WhitelistTab whitelistHook={whitelistHook} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
