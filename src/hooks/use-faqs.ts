import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { sortByOrderInd } from "@/lib/utils";
import type { Faq, FaqCategory } from "@/types";

export const useFaqs = () =>
  useQuery({
    queryKey: [STORE.FAQS],
    queryFn: async () => {
      const db = await getDB();
      if (!db) return { categories: [], faqs: [] };

      const [categories, faqs] = await Promise.all([
        db.getAll(STORE.FAQ_CATEGORIES) as Promise<FaqCategory[]>,
        db.getAll(STORE.FAQS) as Promise<Faq[]>,
      ]);

      return {
        categories: categories.sort(sortByOrderInd()),
        faqs: faqs.sort(sortByOrderInd()),
      };
    },
  });
