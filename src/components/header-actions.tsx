"use client";

import { Shield } from "lucide-react";
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
    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      {/* Primary Top Navigation on Desktop */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
        <Link
          href="/about"
          className="px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
          prefetch={false}
        >
          About
        </Link>
        <a
          href="https://voicepublication.in/collections/radheshyam-das-books"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          Books
        </a>
        <a
          href="https://courses.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          Courses
        </a>
        <a
          href="https://drive.google.com/drive/u/7/folders/16O9qZXeWSruSU3YyYhnpZkCsmIHtIf6s"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          Calendar
        </a>
        <a
          href="http://cvms.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-bold"
        >
          Donate
        </a>
        <Link
          href="/contact-us"
          className="px-2.5 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
          prefetch={false}
        >
          Contact
        </Link>
      </nav>

      {isAdmin && (
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 font-medium border-primary/20 hover:border-primary/50 text-foreground transition-all shadow-sm px-2.5 h-8 text-xs",
          )}
          title="Admin Dashboard"
          prefetch={false}
        >
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}

      <NotificationCenter />
      <div className="flex items-center">
        <UserNav />
      </div>
    </div>
  );
};

