"use server";

import { verifyAdmin } from "@/lib/auth-utils";
import {
  clearTrashService,
  deleteRecordingPermanently,
} from "@/lib/upload-service";

import { deleteCategoryWithContents } from "./category-actions";

export const deleteCategoryPermanentlyAction = async (id: number) => {
  await verifyAdmin();

  if (id === 1) {
    throw new Error("Root trash category cannot be deleted.");
  }

  return deleteCategoryWithContents(id, { permanent: true });
};

export const deleteRecordingPermanentlyAction = async (id: number) => {
  await verifyAdmin();

  return deleteRecordingPermanently(id);
};

export const clearTrashAction = async () => {
  await verifyAdmin();

  return clearTrashService();
};
