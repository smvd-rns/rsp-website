import { useQuery } from "@tanstack/react-query";

export interface ImageItem {
  id: number;
  description: string;
  webp?: string | null;
  url?: string | null;
}

export const IMAGES_QUERY_KEY = ["images"];

export const useImages = () => {
  return useQuery<ImageItem[]>({
    queryKey: IMAGES_QUERY_KEY,
    queryFn: async (): Promise<ImageItem[]> => {
      const res = await fetch("/api/images");
      if (!res.ok) throw new Error("Failed to fetch images");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
