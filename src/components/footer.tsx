"use client";

import { ArrowUp, Heart, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Footer = () => {
  const pathname = usePathname();
  if (pathname === "/queries") return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full border-t border-border/80 bg-card/60 text-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Mission */}
        <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold font-heading text-sm text-foreground">
              Radheshyam Das Spiritual Discourses
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            Dedicated to delivering authentic Vedic wisdom, Bhagavad-gita commentaries, and devotional seminars.
          </p>
          <p className="text-xxs text-muted-foreground/80 mt-1">
            © {new Date().getFullYear()} Radheshyamdas.com. All rights reserved.
          </p>
        </div>

        {/* Footer Utilities (No Duplicate Top Navbar) */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <Link
            href="/contact-us"
            prefetch={false}
            className="hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted flex items-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact & Feedback</span>
          </Link>

          <span className="text-border">•</span>

          <button
            type="button"
            onClick={scrollToTop}
            className="hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted flex items-center gap-1.5 cursor-pointer font-medium"
            title="Scroll to top of page"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
