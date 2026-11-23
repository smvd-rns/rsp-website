import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";

export const usePendingRequestsCount = () =>
  useQuery({
    queryKey: [STORE.USER_EDIT_REQUESTS, "pending_count"],
    queryFn: async (): Promise<number> => {
      const db = await getDB();
      if (!db) return 0;
      const requests = await db.getAll(STORE.USER_EDIT_REQUESTS);
      return requests.filter((r) => r.status === "pending").length;
    },
  });

export const useActiveQueriesCount = () =>
  useQuery({
    queryKey: [STORE.USER_QUERIES, "active_count"],
    queryFn: async (): Promise<number> => {
      const db = await getDB();
      if (!db) return 0;
      const queries = await db.getAll(STORE.USER_QUERIES);
      return queries.filter(
        (q) => q.status === "open" || q.status === "in_progress",
      ).length;
    },
  });

export const useServiceInterestsCount = () =>
  useQuery({
    queryKey: [STORE.USER_SERVICE_INTERESTS, "count"],
    queryFn: async (): Promise<number> => {
      const db = await getDB();
      if (!db) return 0;
      const interests = await db.getAll(STORE.USER_SERVICE_INTERESTS);
      return interests.length;
    },
  });
