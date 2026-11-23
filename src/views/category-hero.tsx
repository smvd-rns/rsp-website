import { Sparkles, Headphones, Radio } from "lucide-react";

export const CategoryHero = () => {
  return (
    <section className="relative rounded-3xl bg-linear-to-br from-amber-500/20 via-orange-500/10 to-rose-500/5 border border-primary/25 p-6 sm:p-10 md:p-12 overflow-hidden shadow-lg">
      {/* Decorative background glow */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
      />
      <div 
        className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col gap-6 max-w-4xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-orange-500/15 to-amber-500/15 border border-primary/30 text-primary text-xs font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Spiritual Vani Archive</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 border border-border/80 text-foreground text-xs font-semibold backdrop-blur-xs shadow-2xs">
            <Headphones className="w-3.5 h-3.5 text-primary" />
            <span>12,000+ Discourses</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 border border-border/80 text-foreground text-xs font-semibold backdrop-blur-xs shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-amber-600" />
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
      </div>
    </section>
  );
};
