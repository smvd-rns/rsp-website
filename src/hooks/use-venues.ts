import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Venue } from "@/types";

export const useVenues = () =>
  useQuery({
    queryKey: [STORE.VENUES],
    queryFn: async (): Promise<Venue[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.VENUES)) as Venue[];
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
