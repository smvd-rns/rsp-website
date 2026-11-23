"use client";

import type { Session } from "@supabase/supabase-js";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
} from "react";
import { getQueryClient } from "@/lib/query-client";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { PageViewsTracker } from "./page-views-tracker";
import { PwaRegister } from "./pwa-register";

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
});

export const useSession = () => useContext(SessionContext);

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data?.session && isMounted) {
            setSession(data.session as Session);
            setIsLoading(false);
            return;
          }
          if (data?.session === null && isMounted) {
            setSession(null);
          }
        }
      } catch {
        // Fallback to client supabase if self-hosted endpoint is unreachable
      }

      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    };

    checkSession();

    const handleAuthChange = () => {
      checkSession();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, currentSession) => {
      if (isMounted && currentSession) {
        setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener("auth-changed", handleAuthChange);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="clean"
      themes={["clean", "monk", "peacock"]}
      disableTransitionOnChange
    >
      <Suspense>
        <SessionContext value={{ session, isLoading }}>
          <QueryClientProvider client={getQueryClient()}>
            <PwaRegister />
            {children}
            <PageViewsTracker />
          </QueryClientProvider>
        </SessionContext>
      </Suspense>
    </ThemeProvider>
  );
};
