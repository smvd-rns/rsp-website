"use server";

import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { executeParallelReorder } from "@/lib/reorder-utils";

// ------------------------------------------------------------------
// FAQ CATEGORIES
// ------------------------------------------------------------------

export const createFaqCategory = async (data: {
  name: string;
  slug: string;
  order_ind?: number;
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("faq_categories").insert({
    name: data.name,
    slug: data.slug,
    order_ind: data.order_ind || 0,
  });

  if (error) {
    console.error("Error creating FAQ category:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const updateFaqCategory = async (
  id: number,
  data: {
    name: string;
    slug: string;
    order_ind?: number;
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient

    .from("faq_categories")
    .update({
      name: data.name,
      slug: data.slug,
      order_ind: data.order_ind !== undefined ? data.order_ind : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating FAQ category:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deleteFaqCategory = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient

    .from("faq_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting FAQ category:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const reorderFaqCategories = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const res = await executeParallelReorder(
    adminClient,
    "faq_categories",
    items,
  );
  if (!res.success) {
    console.error("Error reordering FAQ categories:", res.error);
  }
  return res;
};

// ------------------------------------------------------------------
// FAQS
// ------------------------------------------------------------------

export const createFaq = async (data: {
  category_id: number;
  question: string;
  answer: string;
  order_ind?: number;
  is_published?: boolean;
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("faqs").insert({
    category_id: data.category_id,
    question: data.question,
    answer: data.answer,
    order_ind: data.order_ind || 0,
    is_published: data.is_published !== undefined ? data.is_published : true,
  });

  if (error) {
    console.error("Error creating FAQ:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const updateFaq = async (
  id: number,
  data: {
    category_id: number;
    question: string;
    answer: string;
    order_ind?: number;
    is_published?: boolean;
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient

    .from("faqs")
    .update({
      category_id: data.category_id,
      question: data.question,
      answer: data.answer,
      order_ind: data.order_ind !== undefined ? data.order_ind : 0,
      is_published: data.is_published !== undefined ? data.is_published : true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating FAQ:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deleteFaq = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("faqs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting FAQ:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const reorderFaqs = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const res = await executeParallelReorder(adminClient, "faqs", items);
  if (!res.success) {
    console.error("Error reordering FAQs:", res.error);
  }
  return res;
};
