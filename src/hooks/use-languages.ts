import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Language } from "@/types";

export const useLanguages = () =>
  useQuery({
    queryKey: [STORE.LANGUAGES],
    queryFn: async (): Promise<Language[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.LANGUAGES)) as Language[];
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
