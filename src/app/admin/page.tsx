import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileAudio,
  Flag,
  FlaskConical,
  FolderTree,
  Globe,
  HelpCircle,
  Home,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLOUDFLARE_ANALYTICS_URL } from "@/constants";

interface AdminSectionConfig {
  title: string;
  subtitle: string;
  description: string;
  url: string;
  icon: React.ElementType;
  badge?: string;
  theme: {
    iconBg: string;
    iconColor: string;
    border: string;
    hoverBorder: string;
    hoverBg: string;
    accent: string;
  };
}

const adminSections: AdminSectionConfig[] = [
  {
    title: "Content Management",
    subtitle: "Root & Subcategories",
    description:
      "Organize discourses, hierarchy trees, materials, and audio files.",
    url: "/admin/content",
    icon: FolderTree,
    badge: "Core",
    theme: {
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/20 hover:border-blue-500/60",
      hoverBg: "hover:bg-blue-500/[0.02]",
      accent: "text-blue-600 dark:text-blue-400",
    },
  },
  {
    title: "User Management",
    subtitle: "Roles & Directory",
    description:
      "Manage 4,500+ devotees, role requests (Student, Leader, Monk), and access levels.",
    url: "/admin/users",
    icon: Users,
    badge: "4,576 Users",
    theme: {
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/20 hover:border-emerald-500/60",
      hoverBg: "hover:bg-emerald-500/[0.02]",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
  },
  {
    title: "Support Tickets & Queries",
    subtitle: "Devotee Inquiries",
    description:
      "Review, answer, mentor, and forward spiritual queries from seekers.",
    url: "/admin/queries",
    icon: MessageSquare,
    badge: "Inbox",
    theme: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/20 hover:border-amber-500/60",
      hoverBg: "hover:bg-amber-500/[0.02]",
      accent: "text-amber-600 dark:text-amber-400",
    },
  },
  {
    title: "Service Center (Seva)",
    subtitle: "Catalog & Assignments",
    description:
      "Define seva opportunities, review devotee interests, and assign responsibilities.",
    url: "/admin/services",
    icon: Settings,
    badge: "Seva Hub",
    theme: {
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      iconColor: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/20 hover:border-purple-500/60",
      hoverBg: "hover:bg-purple-500/[0.02]",
      accent: "text-purple-600 dark:text-purple-400",
    },
  },
  {
    title: "Events & Yatras",
    subtitle: "Festival Discourses",
    description:
      "Group recordings under major spiritual events, yatras, and seminars.",
    url: "/admin/events",
    icon: CalendarDays,
    theme: {
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/20 hover:border-indigo-500/60",
      hoverBg: "hover:bg-indigo-500/[0.02]",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
  },
  {
    title: "Audio & Upload Lab",
    subtitle: "Transcoding & Compression",
    description:
      "Multi-bitrate Opus and AAC audio optimization for seamless mobile streaming.",
    url: "/admin/recordings/experiment",
    icon: FlaskConical,
    badge: "Opus / AAC",
    theme: {
      iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      iconColor: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/20 hover:border-teal-500/60",
      hoverBg: "hover:bg-teal-500/[0.02]",
      accent: "text-teal-600 dark:text-teal-400",
    },
  },
  {
    title: "FAQ Knowledgebase",
    subtitle: "Common Answers",
    description:
      "Manage frequently asked spiritual and practical inquiries with rich markdown.",
    url: "/admin/faqs",
    icon: HelpCircle,
    theme: {
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/20 hover:border-rose-500/60",
      hoverBg: "hover:bg-rose-500/[0.02]",
      accent: "text-rose-600 dark:text-rose-400",
    },
  },
  {
    title: "Homepage Management",
    subtitle: "Banners & Announcements",
    description:
      "Configure site announcements, broadcast banners, and pinned discourses.",
    url: "/admin/homepage",
    icon: Home,
    theme: {
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/20 hover:border-cyan-500/60",
      hoverBg: "hover:bg-cyan-500/[0.02]",
      accent: "text-cyan-600 dark:text-cyan-400",
    },
  },
  {
    title: "Link Redirects",
    subtitle: "Shortlinks & Navigation",
    description:
      "Create vanity shortlinks and manage legacy URL migrations with 301/308 redirects.",
    url: "/admin/redirects",
    icon: LinkIcon,
    theme: {
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      iconColor: "text-violet-600 dark:text-violet-400",
      border: "border-violet-500/20 hover:border-violet-500/60",
      hoverBg: "hover:bg-violet-500/[0.02]",
      accent: "text-violet-600 dark:text-violet-400",
    },
  },
  {
    title: "Platform Insights",
    subtitle: "Analytics & Usage",
    description:
      "Audience traffic, download stats, and listening engagement trends.",
    url: "/admin/insights",
    icon: BarChart3,
    theme: {
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      iconColor: "text-sky-600 dark:text-sky-400",
      border: "border-sky-500/20 hover:border-sky-500/60",
      hoverBg: "hover:bg-sky-500/[0.02]",
      accent: "text-sky-600 dark:text-sky-400",
    },
  },
  {
    title: "Feature Flags",
    subtitle: "Runtime Switches",
    description:
      "Toggle experimental features, offline download limits, and beta UI tools.",
    url: "/admin/feature-flags",
    icon: Flag,
    theme: {
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      iconColor: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/20 hover:border-orange-500/60",
      hoverBg: "hover:bg-orange-500/[0.02]",
      accent: "text-orange-600 dark:text-orange-400",
    },
  },
  {
    title: "Trash & Recovery",
    subtitle: "Restore Deleted Items",
    description:
      "Review soft-deleted categories or recordings and restore them safely.",
    url: "/admin/trash",
    icon: Trash2,
    theme: {
      iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
      iconColor: "text-slate-600 dark:text-slate-300",
      border: "border-slate-500/20 hover:border-slate-500/60",
      hoverBg: "hover:bg-slate-500/[0.02]",
      accent: "text-slate-600 dark:text-slate-300",
    },
  },
];

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Hero Console Header */}
      <div className="rounded-3xl border border-border/80 bg-linear-to-b from-card via-card to-muted/20 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                RSP Media Management Suite
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
              Admin Console
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Unified command center for HG Radheshyamdas discourses. Oversee
              content hierarchy, devotee community roles, seva assignments,
              audio transcoders, and support queries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm rounded-xl h-10 px-4 cursor-pointer"
            >
              <Link href="/admin/categories/new" prefetch={false}>
                <Plus className="w-4 h-4 mr-1.5" />
                <span>New Category</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-border hover:bg-muted font-semibold rounded-xl h-10 px-4 cursor-pointer"
            >
              <Link href="/admin/recordings/new" prefetch={false}>
                <FileAudio className="w-4 h-4 mr-1.5 text-blue-600" />
                <span>Upload Recording</span>
              </Link>
            </Button>
            {CLOUDFLARE_ANALYTICS_URL && (
              <Button
                asChild
                variant="ghost"
                className="rounded-xl h-10 px-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <a
                  href={CLOUDFLARE_ANALYTICS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-4 h-4 mr-1.5 text-orange-500" />
                  <span>Traffic</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Colorful Google-Like Section Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Management Sections</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            12 Workspaces Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.title}
                href={section.url}
                prefetch={false}
                className="group focus:outline-hidden"
              >
                <Card
                  className={`h-full p-5 rounded-2xl bg-card border-2 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${section.theme.border} ${section.theme.hoverBg}`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${section.theme.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {section.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/60"
                        >
                          {section.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground/90">
                        {section.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                    <span className={section.theme.accent}>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
