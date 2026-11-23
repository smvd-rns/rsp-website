import { useQuery } from "@tanstack/react-query";
import { getDB } from "@/lib/idb";

export const createSortedStoreQuery = <
  T extends { updated_at?: string | null },
>(
  storeName: string,
  staleTime = 1000 * 60 * 5,
) => {
  return () =>
    useQuery({
      queryKey: [storeName],
      queryFn: async (): Promise<T[]> => {
        const db = await getDB();
        if (!db) return [];
        const data = (await db.getAll(storeName)) as T[];
        return data.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA;
        });
      },
      staleTime,
    });
};
