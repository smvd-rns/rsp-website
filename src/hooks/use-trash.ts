import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Category, Recording } from "@/types";

export const useTrashPage = () =>
  useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const db = await getDB();
      if (!db) return { categories: [], recordings: [], initialized: false };

      const [allCategories, allRecordings] = await Promise.all([
        db.getAll(STORE.CATEGORIES) as Promise<Category[]>,
        db.getAll(STORE.RECORDINGS) as Promise<Recording[]>,
      ]);

      const trashCat = allCategories.find((c) => c.url_path === "trash");
      if (!trashCat) {
        return { categories: [], recordings: [], initialized: false };
      }

      const trashCategories = allCategories
        .filter((c) => c.path === String(trashCat.id))
        .sort((a, b) => b.id - a.id);

      const trashRecordings = allRecordings
        .filter((r) => r.category_id === trashCat.id)
        .sort((a, b) => b.id - a.id);

      return {
        categories: trashCategories,
        recordings: trashRecordings,
        initialized: true,
      };
    },
  });
