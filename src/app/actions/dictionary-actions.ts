"use server";

import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";

export const createEvent = async (
  data: string | { name: string; short_name?: string },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const payload = typeof data === "string" ? { name: data } : data;
  const { data: item, error } = await adminClient
    .from("events")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return item;
};

export const updateEvent = async (
  id: string,
  data: { name: string; short_name?: string },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("events")
    .update({ name: data.name, short_name: data.short_name })
    .eq("id", Number(id));
  if (error) throw new Error(error.message);
};

export const createSpeaker = async (name: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("speakers")
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createLanguage = async (name: string, native_name?: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("languages")
    .insert({ name, native_name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createContentType = async (name: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("content_types")
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createVenue = async (name: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("venues")
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};
