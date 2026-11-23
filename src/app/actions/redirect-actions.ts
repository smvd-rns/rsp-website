"use server";

import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { revalidateCategoryPaths } from "@/lib/revalidate";

export const createRedirect = async ({
  from_path,
  to_path,
}: {
  from_path: string;
  to_path: string;
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const id = from_path;
  const { error } = await adminClient.from("redirects").insert({ id, to_path });
  if (error) {
    if (error.code === "23505")
      throw new Error("This redirect path already exists.");
    throw new Error(error.message);
  }
  revalidateCategoryPaths([id]);
};

export const updateRedirect = async ({
  id,
  from_path,
  to_path,
}: {
  id: string;
  from_path?: string;
  to_path: string;
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const newId = from_path || id;

  if (newId !== id) {
    const { error } = await adminClient
      .from("redirects")
      .update({ id: newId, to_path })
      .eq("id", id);
    if (error) {
      if (error.code === "23505")
        throw new Error("This redirect path already exists.");
      throw new Error(error.message);
    }
    revalidateCategoryPaths([id, newId]);
  } else {
    const { error } = await adminClient
      .from("redirects")
      .update({ to_path })
      .eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    revalidateCategoryPaths([id]);
  }
};

export const deleteRedirect = async (id: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("redirects").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidateCategoryPaths([id]);
};
