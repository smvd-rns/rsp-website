import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Redirect } from "@/types";

export const useRedirects = () =>
  useQuery({
    queryKey: [STORE.REDIRECTS],
    queryFn: async (): Promise<Redirect[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.REDIRECTS)) as Redirect[];
      return data.sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dbTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dbTime - da;
      });
    },
  });
