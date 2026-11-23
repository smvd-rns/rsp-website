"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Flag,
  FlaskConical,
  FolderTree,
  HelpCircle,
  Home,
  LayoutDashboard,
  Link as LinkIcon,
  MessageSquare,
  Settings,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  useActiveQueriesCount,
  usePendingRequestsCount,
  useServiceInterestsCount,
} from "@/hooks/use-counts";

const items = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "Content & Recordings",
    url: "/admin/content",
    icon: FolderTree,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    title: "Audio Encoding Lab",
    url: "/admin/recordings/experiment",
    icon: FlaskConical,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
  },
  {
    title: "Events & Yatras",
    url: "/admin/events",
    icon: CalendarDays,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    title: "Service Center",
    url: "/admin/services",
    icon: Settings,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    title: "FAQ Engine",
    url: "/admin/faqs",
    icon: HelpCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    title: "Support Tickets",
    url: "/admin/queries",
    icon: MessageSquare,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    title: "Platform Insights",
    url: "/admin/insights",
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "Homepage Management",
    url: "/admin/homepage",
    icon: Home,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    title: "Link Redirects",
    url: "/admin/redirects",
    icon: LinkIcon,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    title: "Feature Flags",
    url: "/admin/feature-flags",
    icon: Flag,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    title: "Trash & Archive",
    url: "/admin/trash",
    icon: Trash2,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10",
  },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { data: pendingCount } = usePendingRequestsCount();
  const { data: activeQueriesCount } = useActiveQueriesCount();
  const { data: serviceInterestsCount } = useServiceInterestsCount();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/80 bg-sidebar"
    >
      <SidebarHeader className="border-b border-border/70 h-14 px-3 flex flex-row items-center justify-between overflow-hidden">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 font-bold tracking-tight text-sidebar-foreground group min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0 sidebar-expandable-content">
            <span className="text-xs font-bold font-heading leading-tight flex items-center gap-1.5 truncate">
              <span>RSP Admin</span>
              <span className="text-[9px] font-medium px-1 py-0.2 rounded-sm bg-primary/10 text-primary border border-primary/20">
                Console
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              Spiritual Media Portal
            </span>
          </div>
        </Link>
        <div className="sidebar-expandable-content shrink-0">
          <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-xxs uppercase tracking-wider font-bold text-muted-foreground/80 px-2 mb-1 sidebar-expandable-content">
            Core Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.url ||
                      pathname.startsWith(`${item.url}/`);

                const count =
                  item.title === "Service Center"
                    ? serviceInterestsCount
                    : item.title === "User Management"
                      ? pendingCount
                      : item.title === "Support Tickets"
                        ? activeQueriesCount
                        : undefined;

                const hasCount = count !== undefined && count > 0;

                const countBg =
                  item.title === "Service Center"
                    ? "bg-purple-500"
                    : item.title === "User Management"
                      ? "bg-emerald-500"
                      : "bg-amber-500";

                return (
                  <SidebarMenuItem key={item.title}>
                    <Link
                      href={item.url}
                      prefetch={false}
                      className={`h-10 rounded-xl px-2.5 transition-all text-xs font-medium cursor-pointer flex items-center w-full min-w-0 ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform relative ${item.bg} ${item.color}`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        {hasCount && (
                          <span
                            className={`sidebar-collapsed-dot absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${countBg} ring-2 ring-sidebar shadow-xs`}
                          />
                        )}
                      </div>

                      <div className="sidebar-expandable-content flex items-center justify-between flex-1 min-w-0 ml-2.5">
                        <span className="truncate">{item.title}</span>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {hasCount && (
                            <span
                              className={`flex h-4.5 min-w-[18px] items-center justify-center rounded-full ${countBg} px-1 text-[9px] font-bold text-white shadow-2xs`}
                            >
                              {count}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className="w-3.5 h-3.5 text-primary opacity-80" />
                          )}
                        </div>
                      </div>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
