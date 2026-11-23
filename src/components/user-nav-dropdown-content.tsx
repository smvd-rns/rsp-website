"use client";

import type { Session } from "@supabase/supabase-js";
import { LogOut, MessageSquare, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLE_ID } from "@/constants";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { getUserDisplayName } from "@/lib/utils";
import { CurrentUserAvatar } from "./current-user-avatar";

interface UserNavDropdownContentProps {
  session: Session;
}

export const UserNavDropdownContent = ({
  session,
}: UserNavDropdownContentProps) => {
  const router = useRouter();
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
    router.refresh();
  };
  const userRole = Number(
    session.user.app_metadata?.["role_id"] ??
    session.user.user_metadata?.["role"] ??
    0
  );
  const isAdmin =
    userRole === ADMIN_ROLE_ID ||
    userRole === 1 ||
    session.user.user_metadata?.["role"] === "admin";

  return (
    <DropdownMenuContent align="end" style={{ width: "16rem" }}>
      <DropdownMenuLabel className="border-b border-border flex gap-3">
        <CurrentUserAvatar />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium leading-none truncate">
            {getUserDisplayName(session.user)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuGroup>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <Shield className="mr-2 h-4 w-4 text-primary" />
            Admin Dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/queries")}>
          <MessageSquare className="mr-2 h-4 w-4" />
          My Queries
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuItem
        onClick={handleLogout}
        className="text-destructive focus:text-destructive focus:bg-destructive/10"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};
