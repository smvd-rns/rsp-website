import {
  ASSET_REGISTRY,
  getAssetById as baseGetAssetById,
} from "./asset-registry";

export interface MotifItem {
  id: string;
  name: string;
  category: "sacred" | "floral" | "shastra" | "vignettes";
  assetPath: string;
  description: string;
}

export const MOTIF_REGISTRY: MotifItem[] = ASSET_REGISTRY.map((a) => ({
  id: a.id,
  name: a.name,
  category:
    a.category === "sacred"
      ? "sacred"
      : a.category === "vignettes"
        ? "vignettes"
        : "sacred",
  assetPath: a.assetPath,
  description: a.description,
}));

export const getMotifById = (id?: string | null): MotifItem | undefined => {
  const asset = baseGetAssetById(id);
  if (!asset) return undefined;
  return {
    id: asset.id,
    name: asset.name,
    category: "sacred",
    assetPath: asset.assetPath,
    description: asset.description,
  };
};
