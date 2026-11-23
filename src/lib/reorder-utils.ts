import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = array.slice();
  newArray.splice(
    to < 0 ? newArray.length + to : to,
    0,
    newArray.splice(from, 1)[0],
  );
  return newArray;
};

export const reorderItems = <T extends { id: number | string }>(
  items: T[],
  activeId: number | string,
  overId: number | string,
): T[] => {
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const newIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex === -1 || newIndex === -1) return items;
  return arrayMove(items, oldIndex, newIndex);
};

export const toReorderPayload = <
  T extends { id: number; order_ind: number | null },
>(
  items: T[],
): { id: number; order_ind: number }[] => {
  return items
    .map((item, idx) => ({
      id: item.id,
      order_ind: item.order_ind === idx ? -1 : idx,
    }))
    .filter((item) => item.order_ind !== -1);
};

export const swapAndReorder = <
  T extends { id: number; order_ind: number | null },
>(
  items: T[],
  index: number,
  direction: "up" | "down",
): { id: number; order_ind: number }[] | null => {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return null;

  const newItems = [...items];
  const temp = newItems[index];
  temp.order_ind = -1;
  newItems[targetIndex].order_ind = -1;
  newItems[index] = newItems[targetIndex];
  newItems[targetIndex] = temp;

  console.log(JSON.stringify(newItems));

  // we need to keep toReorderPayload to handle null order_ind
  return toReorderPayload(newItems);
};

export const executeParallelReorder = async (
  client: SupabaseClient<Database, "prod", "prod">,
  tableName: string,
  items: { id: number; order_ind: number }[],
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await client.rpc("reorder_items", {
    p_table_name: tableName,
    p_items: items,
  });

  return error ? { success: false, error: error.message } : { success: true };
};
