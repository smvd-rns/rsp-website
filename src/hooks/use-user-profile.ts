"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers";
import { STORE } from "@/constants";
import { useUserPendingRequestIdb } from "@/hooks/use-user-pending-request-idb";
import { getDB } from "@/lib/idb";
import type { UserProfile } from "@/types";

export const useUserProfile = () => {
  const { session, isLoading: sessionLoading } = useSession();
  const userId = session?.user?.id;

  const profileQuery = useQuery({
    queryKey: ["user_profile", userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const json = await res.json();
          if (json?.profile) {
            // Also cache into IndexedDB
            const db = await getDB();
            if (db) {
              await db.put(STORE.USERS, json.profile).catch(() => {});
            }
            return json.profile as UserProfile;
          }
        }
      } catch (err) {
        console.warn("[useUserProfile] Live fetch error, falling back to local cache:", err);
      }

      // Fallback to IndexedDB
      const db = await getDB();
      if (db) {
        const cached = await db.get(STORE.USERS, userId);
        if (cached) return cached as UserProfile;
      }

      // Fallback to session data
      if (session?.user) {
        return {
          id: userId,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
          email: session.user.email || "",
          phone: null,
          ashram: "Visitor",
          temple: null,
          purpose: null,
          authority_name: null,
          authority_email: null,
          authority_relationship: null,
          role_id: Number(session.user.app_metadata?.role_id || session.user.user_metadata?.role || 1),
          status: "verified",
          created_at: null,
          updated_at: null,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        } as unknown as UserProfile;
      }

      return null;
    },
    enabled: Boolean(userId),
    staleTime: 30000,
  });

  const pendingRequestQuery = useUserPendingRequestIdb(userId);

  return {
    profile: profileQuery.data ?? null,
    isLoading:
      profileQuery.isLoading || pendingRequestQuery.isLoading || sessionLoading,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    pendingRequest: pendingRequestQuery.data ?? null,
    isPendingRequestLoading: pendingRequestQuery.isLoading,
  };
};

export const useSubmitProfileUpdate = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      phone: string | null;
      temple: string | null;
      ashram: string | null;
      purpose: string | null;
      authority_name: string | null;
      authority_email: string | null;
      authority_relationship: string | null;
      requested_role_id?: number | null;
      reason?: string | null;
    }) => {
      if (!session?.user?.id) throw new Error("No active session");

      const res = await fetch("/api/user/edit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          name: values.name,
          phone: values.phone,
          temple: values.temple,
          ashram: values.ashram,
          purpose: values.purpose,
          authority_name: values.authority_name,
          authority_email: values.authority_email,
          authority_relationship: values.authority_relationship,
          requested_role_id: values.requested_role_id ?? null,
          reason: values.reason ?? "Profile update request by user",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to submit edit request");
      }

      // Save to IndexedDB immediately
      const db = await getDB();
      if (db && json.data) {
        await db.put(STORE.USERS, json.data).catch(() => {});
      }

      return json.data;
    },
    onSuccess: () => {
      if (session?.user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["user_profile", session.user.id],
        });
        queryClient.invalidateQueries({
          queryKey: [STORE.USERS, session.user.id],
        });
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_EDIT_REQUESTS, session.user.id],
        });
      }
      window.dispatchEvent(new Event("auth-changed"));
    },
  });
};
