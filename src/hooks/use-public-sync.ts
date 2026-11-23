"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@/constants";

/**
 * Local-First Architecture:
 * Background sync worker is disabled. The app runs directly against local/production PostgreSQL.
 */
export const usePublicSync = () => {
  return useQuery({
    queryKey: [QUERY_KEY.SYNC_PUBLIC],
    queryFn: async () => 1,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchInterval: false,
    enabled: false,
  });
};

