"use server";

import type { Database } from "@/database.types";
import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { revalidateFeatureFlags } from "@/lib/revalidate";

type FeatureFlagUpdate = Database["prod"]["Tables"]["feature_flags"]["Update"];

export interface CreateFeatureFlagData {
  id: string;
  name: string;
  description?: string | null;
  is_enabled?: boolean;
  is_ga?: boolean;
  allowed_roles?: number[];
  allowed_emails?: string[];
}

export interface UpdateFeatureFlagData {
  name?: string;
  description?: string | null;
  is_enabled?: boolean;
  is_ga?: boolean;
  allowed_roles?: number[];
  allowed_emails?: string[];
}

export const getFeatureFlags = async () => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("feature_flags")
    .select("*")
    .order("id");

  if (error) {
    console.error("Error fetching feature flags:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
};

export const createFeatureFlag = async (data: CreateFeatureFlagData) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const id = data.id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "_");

  const { error } = await adminClient.from("feature_flags").insert({
    id,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    is_enabled: data.is_enabled ?? false,
    is_ga: data.is_ga ?? false,
    allowed_roles: data.allowed_roles || [],
    allowed_emails: (data.allowed_emails || [])
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean),
  });

  if (error) {
    console.error("Error creating feature flag:", error);
    return { success: false, error: error.message };
  }

  await revalidateFeatureFlags();
  return { success: true };
};

export const updateFeatureFlag = async (
  id: string,
  data: UpdateFeatureFlagData,
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const updatePayload: FeatureFlagUpdate = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.description !== undefined)
    updatePayload.description = data.description?.trim() || null;
  if (data.is_enabled !== undefined) updatePayload.is_enabled = data.is_enabled;
  if (data.is_ga !== undefined) updatePayload.is_ga = data.is_ga;
  if (data.allowed_roles !== undefined)
    updatePayload.allowed_roles = data.allowed_roles;
  if (data.allowed_emails !== undefined)
    updatePayload.allowed_emails = data.allowed_emails
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);

  const { error } = await adminClient
    .from("feature_flags")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Error updating feature flag:", error);
    return { success: false, error: error.message };
  }

  await revalidateFeatureFlags();
  return { success: true };
};

export const toggleFeatureFlag = async (id: string, is_enabled: boolean) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("feature_flags")
    .update({ is_enabled })
    .eq("id", id);

  if (error) {
    console.error("Error toggling feature flag:", error);
    return { success: false, error: error.message };
  }

  await revalidateFeatureFlags();
  return { success: true };
};

export const deleteFeatureFlag = async (id: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("feature_flags")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting feature flag:", error);
    return { success: false, error: error.message };
  }

  await revalidateFeatureFlags();
  return { success: true };
};
