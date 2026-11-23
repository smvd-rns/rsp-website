"use server";

import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";

// ASSIGNMENTS

export const createServiceAssignment = async (data: {
  userId: string;
  serviceId: number;
  role: string;
  status: "active" | "completed" | "paused";
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
}) => {
  const adminUser = await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: result, error } = await adminClient
    .from("user_service_assignments")
    .insert({
      user_id: data.userId,
      service_id: data.serviceId,
      role: data.role,
      status: data.status,
      started_at: data.startedAt,
      ended_at: data.endedAt || null,
      notes: data.notes || null,
      assigned_by: adminUser.id,
    })
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return result;
};

export const updateServiceAssignment = async (
  id: string,
  data: {
    role: string;
    status: "active" | "completed" | "paused";
    startedAt: string;
    endedAt?: string | null;
    notes?: string | null;
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: result, error } = await adminClient
    .from("user_service_assignments")
    .update({
      role: data.role,
      status: data.status,
      started_at: data.startedAt,
      ended_at: data.endedAt || null,
      notes: data.notes || null,
    })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return result;
};

export const deleteServiceAssignment = async (id: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_service_assignments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
};

// INTERESTS

export const deleteServiceInterest = async (
  userId: string,
  serviceId: number,
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_service_interests")
    .delete()
    .eq("user_id", userId)
    .eq("service_id", serviceId);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
};

// RESPONSIBILITIES

export const createResponsibility = async (data: {
  userId: string;
  title: string;
  scope?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}) => {
  const adminUser = await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: result, error } = await adminClient
    .from("user_responsibilities")
    .insert({
      user_id: data.userId,
      title: data.title,
      scope: data.scope || null,
      started_at: data.startedAt || null,
      ended_at: data.endedAt || null,
      assigned_by: adminUser.id,
    })
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return result;
};

export const updateResponsibility = async (
  id: string,
  data: {
    title: string;
    scope?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: result, error } = await adminClient
    .from("user_responsibilities")
    .update({
      title: data.title,
      scope: data.scope || null,
      started_at: data.startedAt || null,
      ended_at: data.endedAt || null,
    })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return result;
};

export const deleteResponsibility = async (id: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_responsibilities")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
};

// SERVICES

export const createService = async (data: {
  name: string;
  type?: string;
  description?: string;
  is_public: boolean;
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("services").insert(data);
  if (error) throw new Error(error.message);
};

export const reorderServices = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { executeParallelReorder } = await import("@/lib/reorder-utils");
  const res = await executeParallelReorder(adminClient, "services", items);
  if (!res.success) throw new Error(res.error);
};
