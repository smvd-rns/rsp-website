"use server";

import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";

export const prepareImageUpload = async (description: string) => {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("images")
      .insert({ description })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during image preparation",
    };
  }
};

export const deleteImage = async (id: number) => {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();
    const webpFilename = `${id.toString(36)}.webp`;
    const avifFilename = `${id.toString(36)}.avif`;

    const { error: dbError } = await adminClient
      .from("images")
      .delete()
      .eq("id", id);

    if (dbError) {
      if (dbError.code === "23503") {
        return {
          success: false,
          error:
            "This image is currently in use by a category or recording and cannot be deleted.",
        };
      }
      return { success: false, error: dbError.message };
    }

    const { error: storageError } = await adminClient.storage
      .from("images")
      .remove([webpFilename, avifFilename]);
    if (storageError)
      console.error("Storage deletion error (continuing):", storageError);

    const { deleteKvKey } = await import("@/lib/cloudflare-kv");
    await deleteKvKey(`img:${id}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during deletion",
    };
  }
};

export const updateImageDescription = async (
  id: number,
  description: string,
) => {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("images")
      .update({ description })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during description update",
    };
  }
};

export const getImageUploadSessionUrl = async (
  fileName: string,
  mimeType: string,
  origin?: string,
) => {
  await verifyAdmin();
  const { createImageUploadSession } = await import("@/lib/upload-service");
  return createImageUploadSession(fileName, mimeType, origin);
};

export const saveImageDriveIds = async (
  id: number,
  driveIds: {
    webp?: string | null;
    avif?: string | null;
    webp_2x?: string | null;
    avif_2x?: string | null;
  },
) => {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("images")
      .update({
        ...driveIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    const { setKvKey } = await import("@/lib/cloudflare-kv");
    await setKvKey(`img:${id}`, {
      webp: driveIds.webp || "",
      webp_2x: driveIds.webp_2x || "",
      avif: driveIds.avif || "",
      avif_2x: driveIds.avif_2x || "",
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving image drive ids",
    };
  }
};
