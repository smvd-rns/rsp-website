"use client";

import {
  BookOpen,
  Calendar,
  Compass,
  ExternalLink,
  GraduationCap,
  Grid,
  Heart,
  Home,
  Info,
  LogIn,
  LogOut,
  PhoneCall,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { ADMIN_ROLE_ID } from "@/constants";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { AuthModal } from "./auth-modal";
import { useSession } from "./providers";

export const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Do not show public bottom navbar on admin dashboard
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const userRole = Number(
    session?.user?.app_metadata?.["role_id"] ??
      session?.user?.user_metadata?.["role"] ??
      0,
  );
  const isAdmin =
    userRole === ADMIN_ROLE_ID ||
    userRole === 1 ||
    session?.user?.user_metadata?.["role"] === "admin";

  const handleSearchClick = () => {
    window.dispatchEvent(new CustomEvent("open-search"));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("auth-changed"));
    setMoreOpen(false);
    router.refresh();
  };

  const isHomeActive = pathname === "/";

  return (
    <>
      {/* Symmetrical 7-Item Mobile Navigation Bar (Matching Laptop Header Gradient) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t shadow-2xl md:hidden flex items-center justify-between px-1 h-16 pb-[env(safe-area-inset-bottom)] select-none text-white"
        style={{
          background: "var(--header-bg, linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #d97706 100%))",
          borderColor: "var(--header-border, rgba(180, 83, 9, 0.4))",
        }}
      >
        {/* 1. Home (Left 1) */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold transition-all active:scale-95",
            isHomeActive
              ? "text-white font-bold drop-shadow-xs"
              : "text-white/80 hover:text-white",
          )}
          prefetch={false}
        >
          <Home className={cn("w-4.5 h-4.5 mb-0.5", isHomeActive ? "stroke-[2.6]" : "stroke-[2]")} />
          <span>Home</span>
        </Link>

        {/* 2. Books (Left 2) */}
        <a
          href="https://voicepublication.in/collections/radheshyam-das-books"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold text-white/80 hover:text-white transition-all active:scale-95"
        >
          <BookOpen className="w-4.5 h-4.5 mb-0.5" />
          <span>Books</span>
        </a>

        {/* 3. Calendar (Left 3) */}
        <a
          href="https://drive.google.com/drive/u/7/folders/16O9qZXeWSruSU3YyYhnpZkCsmIHtIf6s"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold text-white/80 hover:text-white transition-all active:scale-95"
        >
          <Calendar className="w-4.5 h-4.5 mb-0.5" />
          <span>Calendar</span>
        </a>

        {/* 4. SEARCH (DEAD CENTER - Elevated Prominent Button) */}
        <button
          type="button"
          onClick={handleSearchClick}
          className="flex flex-col items-center justify-center flex-1 h-full py-0.5 group active:scale-95 transition-transform cursor-pointer"
          aria-label="Search discourses"
        >
          <div className="w-11 h-11 rounded-full bg-white text-orange-600 shadow-xl shadow-black/25 ring-3 ring-white/35 flex items-center justify-center -translate-y-2 transition-all">
            <Search className="w-5 h-5 stroke-[2.6]" />
          </div>
          <span className="text-[9px] font-bold text-white -translate-y-1 drop-shadow-xs">Search</span>
        </button>

        {/* 5. Courses (Right 1) */}
        <a
          href="https://courses.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold text-white/80 hover:text-white transition-all active:scale-95"
        >
          <GraduationCap className="w-4.5 h-4.5 mb-0.5" />
          <span>Courses</span>
        </a>

        {/* 6. Donate (Right 2) */}
        <a
          href="http://cvms.radheshyamdas.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold text-white/90 hover:text-white transition-all active:scale-95"
        >
          <Heart className="w-4.5 h-4.5 mb-0.5 fill-white/30 stroke-white stroke-[2.2]" />
          <span>Donate</span>
        </a>

        {/* 7. More (Right 3) */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-semibold transition-all active:scale-95 cursor-pointer",
            moreOpen
              ? "text-white font-bold drop-shadow-xs"
              : "text-white/80 hover:text-white",
          )}
        >
          <Grid className={cn("w-4.5 h-4.5 mb-0.5", moreOpen ? "stroke-[2.6]" : "stroke-[2]")} />
          <span>More</span>
        </button>
      </nav>

      {/* Guest Sign-in Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Adaptive Mobile 'More' Drawer Sheet (Clean, uncluttered, no redundant top header) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl border-t border-border/70 bg-card p-0 max-h-[82dvh] overflow-hidden flex flex-col z-50 shadow-2xl"
        >
          {/* Top handle bar with discreet close button */}
          <div className="w-full flex items-center justify-between px-5 pt-3 pb-2">
            <div className="w-6" />
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            <SheetClose asChild>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </SheetClose>
          </div>

          <SheetTitle className="sr-only">More Options</SheetTitle>

          {/* Clean List of Nav Options */}
          <div className="px-4 pb-6 flex flex-col gap-2.5 overflow-y-auto">
            {/* Account / Profile Quick Tile */}
            {session ? (
              <Link
                href="/profile"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-foreground transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-primary/40">
                    <CurrentUserAvatar />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">
                      {session.user?.user_metadata?.["full_name"] ||
                        session.user?.email?.split("@")[0] ||
                        "My Profile"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      View profile & study history
                    </span>
                  </div>
                </div>
                <User className="w-4 h-4 text-primary" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setAuthOpen(true);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-linear-to-r from-amber-500/15 via-orange-500/15 to-primary/15 border border-primary/25 text-primary font-bold text-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <LogIn className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span>Sign In / Register</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Save favorite discourses & access study materials
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* Core Sections */}
            <div className="flex flex-col gap-1 rounded-2xl bg-muted/30 border border-border/50 p-1.5">
              <Link
                href="/library"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/70 text-sm font-medium transition-colors"
                prefetch={false}
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4.5 h-4.5 text-primary" />
                  <span>Explore Spiritual Library</span>
                </div>
              </Link>

              <a
                href="https://drive.google.com/drive/u/7/folders/16O9qZXeWSruSU3YyYhnpZkCsmIHtIf6s"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/70 text-sm font-medium transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4.5 h-4.5 text-primary" />
                  <span>Discourse Calendar & Schedule</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>

              <Link
                href="/about"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/70 text-sm font-medium transition-colors"
                prefetch={false}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4.5 h-4.5 text-primary" />
                  <span>About HG Radheshyam Das</span>
                </div>
              </Link>

              <Link
                href="/contact-us"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/70 text-sm font-medium transition-colors"
                prefetch={false}
              >
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-4.5 h-4.5 text-primary" />
                  <span>Contact & Feedback</span>
                </div>
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold transition-colors"
                  prefetch={false}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4.5 h-4.5 text-primary" />
                    <span>Admin Dashboard</span>
                  </div>
                </Link>
              )}
            </div>

            {/* Logout (if authenticated) */}
            {session && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-xl text-destructive hover:bg-destructive/10 text-sm font-semibold transition-colors cursor-pointer w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
