"use client";
import { ExternalLink, Heart, Mail, MessageSquare, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getRoleLabel } from "../utils";

interface ProfileDashboardCardProps {
  user: { email?: string };
  fullName: string;
  ashram: string;
  roleId: number | undefined;
  onServicesClick: () => void;
  onQueriesClick: () => void;
  avatarUrl?: string | null;
}

export function ProfileDashboardCard({
  user,
  fullName,
  ashram,
  roleId,
  onServicesClick,
  onQueriesClick,
  avatarUrl,
}: ProfileDashboardCardProps) {
  return (
    <Card className="border-[1.5px] border-[#8b5a2b]/35 dark:border-amber-600/40 shadow-sm rounded-2xl bg-card overflow-hidden">
      <div
        className="bg-linear-to-r from-amber-500/25 via-orange-500/15 to-amber-500/20 border-b border-[#8b5a2b]/20 dark:border-amber-600/30 relative"
        style={{ height: "6rem" }}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600" />
      </div>
      <div
        className="px-6 pb-6 relative flex flex-col items-center text-center"
        style={{ marginTop: "-2.5rem" }}
      >
        <div
          className="rounded-full bg-card border-2 border-primary/50 ring-4 ring-background flex items-center justify-center text-primary font-bold text-2xl shadow-md mb-4 overflow-hidden"
          style={{ height: "5rem", width: "5rem" }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || "Avatar"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : fullName ? (
            fullName.charAt(0).toUpperCase()
          ) : (
            user.email?.charAt(0).toUpperCase()
          )}
        </div>

        <h2 className="text-lg font-bold">
          {fullName || user.email?.split("@")[0] || "User"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Mail className="w-3 h-3 text-primary/70" />
          {user.email}
        </p>

        <div
          className="w-full border-t border-[#8b5a2b]/20 dark:border-amber-600/30 my-4"
        />

        <div className="w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-xs">
            {[1, 4, 5, 7, 8].includes(roleId ?? 0) && (
              <span
                className={`font-bold px-3 py-1 rounded-full border text-xs flex items-center gap-1.5 bg-primary/10 text-primary ${
                  roleId === 4 || roleId === 7
                    ? "border-primary/40 shadow-xs"
                    : "border-primary/25"
                }`}
              >
                <Shield className="size-3.5 text-primary opacity-80" />
                {getRoleLabel(roleId)}
              </span>
            )}
            {ashram && (
              <span
                className="font-bold bg-muted/80 border border-[#8b5a2b]/20 dark:border-amber-600/30 px-3 py-1 rounded-full"
                style={{ textTransform: "capitalize" }}
              >
                {ashram}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary/70" />
              Service Interests
            </span>
            <button
              type="button"
              onClick={onServicesClick}
              className="font-bold bg-muted/80 hover:bg-primary/20 hover:text-primary transition-all px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer border border-[#8b5a2b]/25 dark:border-amber-600/35"
            >
              <span>Explore</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary/70" />
              Support Tickets
            </span>
            <button
              type="button"
              onClick={onQueriesClick}
              className="font-bold bg-muted/80 hover:bg-primary/20 hover:text-primary transition-all px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer border border-[#8b5a2b]/25 dark:border-amber-600/35"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
