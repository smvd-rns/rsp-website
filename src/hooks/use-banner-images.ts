import { STORE } from "@/constants";
import type { BannerImage } from "@/types";
import { createSortedStoreQuery } from "./use-store-query";

export const BANNER_IMAGES_QUERY_KEY = [STORE.BANNER_IMAGES];

export const useBannerImages = createSortedStoreQuery<BannerImage>(
  STORE.BANNER_IMAGES,
);
