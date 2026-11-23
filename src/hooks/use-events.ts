import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Event } from "@/types";

export const useEvents = () =>
  useQuery({
    queryKey: [STORE.EVENTS],
    queryFn: async (): Promise<Event[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.EVENTS)) as Event[];
      return data.sort((a, b) =>
        (a.short_name || a.name).localeCompare(b.short_name || b.name),
      );
    },
  });
