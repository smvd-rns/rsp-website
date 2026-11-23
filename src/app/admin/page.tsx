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
    cardBg: string;
    accent: string;
    badgeStyle: string;
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
      iconBg: "bg-sky-500/15 text-sky-700",
      iconColor: "text-sky-700",
      border: "border-sky-200/90 hover:border-sky-400",
      cardBg: "bg-sky-50/35 hover:bg-sky-50/70",
      accent: "text-sky-700",
      badgeStyle: "bg-sky-100 text-sky-800 border-sky-300",
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
      iconBg: "bg-emerald-500/15 text-emerald-700",
      iconColor: "text-emerald-700",
      border: "border-emerald-200/90 hover:border-emerald-400",
      cardBg: "bg-emerald-50/35 hover:bg-emerald-50/70",
      accent: "text-emerald-700",
      badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
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
      iconBg: "bg-amber-500/15 text-amber-800",
      iconColor: "text-amber-800",
      border: "border-amber-200/90 hover:border-amber-400",
      cardBg: "bg-amber-50/35 hover:bg-amber-50/70",
      accent: "text-amber-800",
      badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
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
      iconBg: "bg-purple-500/15 text-purple-700",
      iconColor: "text-purple-700",
      border: "border-purple-200/90 hover:border-purple-400",
      cardBg: "bg-purple-50/35 hover:bg-purple-50/70",
      accent: "text-purple-700",
      badgeStyle: "bg-purple-100 text-purple-800 border-purple-300",
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
      iconBg: "bg-indigo-500/15 text-indigo-700",
      iconColor: "text-indigo-700",
      border: "border-indigo-200/90 hover:border-indigo-400",
      cardBg: "bg-indigo-50/35 hover:bg-indigo-50/70",
      accent: "text-indigo-700",
      badgeStyle: "bg-indigo-100 text-indigo-800 border-indigo-300",
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
      iconBg: "bg-teal-500/15 text-teal-700",
      iconColor: "text-teal-700",
      border: "border-teal-200/90 hover:border-teal-400",
      cardBg: "bg-teal-50/35 hover:bg-teal-50/70",
      accent: "text-teal-700",
      badgeStyle: "bg-teal-100 text-teal-800 border-teal-300",
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
      iconBg: "bg-rose-500/15 text-rose-700",
      iconColor: "text-rose-700",
      border: "border-rose-200/90 hover:border-rose-400",
      cardBg: "bg-rose-50/35 hover:bg-rose-50/70",
      accent: "text-rose-700",
      badgeStyle: "bg-rose-100 text-rose-800 border-rose-300",
    },
  },
  {
    title: "Homepage Management",
    subtitle: "Banners & Announcements",
    description:
      "Configure site announcements, broadcast banners, and pinned discourses.",
    url: "/admin/homepage",
    icon: Home,
    badge: "Live Portal",
    theme: {
      iconBg: "bg-orange-500/15 text-orange-700",
      iconColor: "text-orange-700",
      border: "border-orange-200/90 hover:border-orange-400",
      cardBg: "bg-orange-50/35 hover:bg-orange-50/70",
      accent: "text-orange-700",
      badgeStyle: "bg-orange-100 text-orange-800 border-orange-300",
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
      iconBg: "bg-pink-500/15 text-pink-700",
      iconColor: "text-pink-700",
      border: "border-pink-200/90 hover:border-pink-400",
      cardBg: "bg-pink-50/35 hover:bg-pink-50/70",
      accent: "text-pink-700",
      badgeStyle: "bg-pink-100 text-pink-800 border-pink-300",
    },
  },
  {
    title: "Platform Insights",
    subtitle: "Analytics & Usage",
    description:
      "Audience traffic, download stats, and listening engagement trends.",
    url: "/admin/insights",
    icon: BarChart3,
    badge: "Telemetry",
    theme: {
      iconBg: "bg-violet-500/15 text-violet-700",
      iconColor: "text-violet-700",
      border: "border-violet-200/90 hover:border-violet-400",
      cardBg: "bg-violet-50/35 hover:bg-violet-50/70",
      accent: "text-violet-700",
      badgeStyle: "bg-violet-100 text-violet-800 border-violet-300",
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
      iconBg: "bg-fuchsia-500/15 text-fuchsia-700",
      iconColor: "text-fuchsia-700",
      border: "border-fuchsia-200/90 hover:border-fuchsia-400",
      cardBg: "bg-fuchsia-50/35 hover:bg-fuchsia-50/70",
      accent: "text-fuchsia-700",
      badgeStyle: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
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
      iconBg: "bg-stone-500/15 text-stone-700",
      iconColor: "text-stone-700",
      border: "border-stone-200 hover:border-stone-400",
      cardBg: "bg-stone-100/40 hover:bg-stone-100/80",
      accent: "text-stone-700",
      badgeStyle: "bg-stone-100 text-stone-800 border-stone-300",
    },
  },
];

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-12">
      {/* Warm Saffron Hero Console Header */}
      <div className="rounded-3xl border-2 border-orange-200/90 bg-linear-to-br from-orange-50/90 via-amber-50/60 to-stone-50 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
              <span className="text-xs font-bold tracking-wide uppercase text-orange-800/90">
                HG Radheshyam Das Vani • Admin Console
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 font-heading">
              Admin Control Center
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Unified command center for spiritual discourses. Oversee content hierarchy,
              devotee roles, seva assignments, audio transcoders, and support queries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold shadow-xs rounded-xl h-10 px-4 cursor-pointer transition-all"
            >
              <Link href="/admin/categories/new" prefetch={false}>
                <Plus className="w-4 h-4 mr-1.5" />
                <span>New Category</span>
              </Link>
            </Button>
            <Button
              asChild
              className="bg-linear-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-xs rounded-xl h-10 px-4 cursor-pointer transition-all"
            >
              <Link href="/admin/recordings/new" prefetch={false}>
                <FileAudio className="w-4 h-4 mr-1.5" />
                <span>Upload Recording</span>
              </Link>
            </Button>
            {CLOUDFLARE_ANALYTICS_URL && (
              <Button
                asChild
                variant="outline"
                className="border-orange-300 hover:bg-orange-100/60 font-semibold rounded-xl h-10 px-3 text-orange-900 cursor-pointer"
              >
                <a
                  href={CLOUDFLARE_ANALYTICS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-4 h-4 mr-1.5 text-orange-600" />
                  <span>Traffic</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Colorful Section Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading tracking-tight text-stone-900 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-orange-600" />
            <span>Management Workspaces</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            12 Active Workspaces
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
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
                  className={`h-full p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${section.theme.border} ${section.theme.cardBg}`}
                >
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${section.theme.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {section.badge && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${section.theme.badgeStyle}`}
                        >
                          {section.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-base tracking-tight text-stone-900 group-hover:text-orange-700 transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-xs font-semibold text-stone-600">
                        {section.subtitle}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-bold">
                    <span className={section.theme.accent}>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 group-hover:text-stone-900 transition-all" />
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
