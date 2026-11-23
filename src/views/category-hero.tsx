import { BookOpen, Sparkles, Headphones, Radio, Compass, Disc3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const CategoryHero = () => {
  return (
    <section className="relative rounded-3xl bg-linear-to-br from-primary/15 via-card to-background border border-primary/20 p-6 sm:p-10 md:p-12 overflow-hidden shadow-xl">
      {/* Decorative background glow */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
      />
      <div 
        className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col gap-6 max-w-4xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Spiritual Vani Archive</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/80 border border-border text-muted-foreground text-xs font-medium backdrop-blur-xs">
            <Headphones className="w-3.5 h-3.5 text-primary" />
            <span>12,000+ Discourses</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/80 border border-border text-muted-foreground text-xs font-medium backdrop-blur-xs">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span>1,100+ Topics</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col gap-2.5">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground leading-[1.15]">
            Divine Wisdom by{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-amber-600 to-primary">
              HG Radheshyam Das
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl font-sans">
            Explore authentic Vedic wisdom, Bhagavad-gita in-depth purports, Srimad Bhagavatam lilas, and practical seminars designed to uplift every aspect of life.
          </p>
        </div>

        {/* Quick Topic Shortcut Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-foreground flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-primary" /> Popular Topics:
          </span>
          <Link
            href="/temple-lectures"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs flex items-center gap-1"
          >
            <Disc3 className="w-3 h-3 text-primary" />
            Temple Lectures
          </Link>
          <Link
            href="/brahmachari-training"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs"
          >
            Brahmachari Training
          </Link>
          <Link
            href="/senior-vaishnavas-vani"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs"
          >
            Senior Vaishnavas Vani
          </Link>
          <Link
            href="/hindi"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs"
          >
            Hindi Discourses
          </Link>
          <Link
            href="/kirtans-and-bhajans"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs"
          >
            Kirtans & Bhajans
          </Link>
          <Link
            href="/japa-talks"
            prefetch={false}
            className="px-3 py-1 rounded-lg bg-card/90 hover:bg-primary/15 hover:text-primary transition-all text-xs font-semibold border border-border/80 shadow-xs"
          >
            Japa Talks
          </Link>
        </div>
      </div>
    </section>
  );
};
