import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { ContentType } from "@/types";

export const useContentTypes = () =>
  useQuery({
    queryKey: [STORE.CONTENT_TYPES],
    queryFn: async (): Promise<ContentType[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.CONTENT_TYPES)) as ContentType[];
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
