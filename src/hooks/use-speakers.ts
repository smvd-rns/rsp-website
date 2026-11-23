import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Speaker } from "@/types";

export const useSpeakers = () =>
  useQuery({
    queryKey: [STORE.SPEAKERS],
    queryFn: async (): Promise<Speaker[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.SPEAKERS)) as Speaker[];
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
