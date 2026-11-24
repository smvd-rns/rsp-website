"use client";

import { Search, Shield } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ADMIN_ROLE_ID } from "@/constants";
import { NotificationCenter } from "./notification-center";
import { buttonVariants } from "./ui/button";
import { UserNav } from "./user-nav";
import { useSession } from "./providers";

export const HeaderActions = () => {
  const { session } = useSession();
  const userRole = Number(
    session?.user?.app_metadata?.["role_id"] ??
    session?.user?.user_metadata?.["role"] ??
    0
  );
  const isAdmin =
    userRole === ADMIN_ROLE_ID ||
    userRole === 1 ||
    session?.user?.user_metadata?.["role"] === "admin";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 text-white">
      {/* Quick Search Trigger on Mobile */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer active:scale-95"
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Primary Top Navigation on Desktop */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold mr-1">
        <Link
          href="/about"
          className="px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
          prefetch={false}
        >
          About
        </Link>
        <a
          href="https://voicepublication.in/collections/radheshyam-das-books"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
        >
          Books
        </a>
        <a
          href="https://courses.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
        >
          Courses
        </a>
        <a
          href="https://drive.google.com/drive/u/7/folders/16O9qZXeWSruSU3YyYhnpZkCsmIHtIf6s"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
        >
          Calendar
        </a>
        <a
          href="http://cvms.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full bg-white text-orange-700 hover:bg-amber-50 font-bold transition-all shadow-xs text-xs active:scale-95"
        >
          Donate
        </a>
        <Link
          href="/contact-us"
          className="px-2.5 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
          prefetch={false}
        >
          Contact
        </Link>
      </nav>

      {isAdmin && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 font-medium border border-white/30 bg-white/15 hover:bg-white/25 text-white transition-all shadow-xs rounded-lg px-2.5 h-8 text-xs"
          title="Admin Dashboard"
          prefetch={false}
        >
          <Shield className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}

      <NotificationCenter />
      <div className="hidden md:flex items-center">
        <UserNav />
      </div>
    </div>
  );
};

