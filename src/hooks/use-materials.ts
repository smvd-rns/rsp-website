import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Material } from "@/types";

export const useMaterials = () =>
  useQuery({
    queryKey: [STORE.MATERIALS],
    queryFn: async () => {
      const db = await getDB();
      if (!db) return [];
      const data = (await db.getAll(STORE.MATERIALS)) as Material[];
      return data;
    },
  });
