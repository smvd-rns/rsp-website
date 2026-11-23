import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { deleteWhitelistUser } from "@/app/actions/user-actions";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { WhitelistUser } from "../types";
import { useUserTableQuery } from "./use-user-table-query";

export const useWhitelist = () => {
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const query = useUserTableQuery<WhitelistUser>(
    STORE.USER_WHITELIST,
    (u, s) => !!u.email?.toLowerCase().includes(s),
  );

  const confirmDeleteWhitelist = useCallback(
    async (email: string) => {
      try {
        await deleteWhitelistUser(email);
        toast.success("User removed from whitelist");

        const db = await getDB();
        if (db) {
          await db.delete(STORE.USER_WHITELIST, email);
        }

        queryClient.invalidateQueries({ queryKey: [STORE.USER_WHITELIST] });
        triggerSync();

        const newTotal = query.count - 1;
        const totalPages = Math.ceil(newTotal / query.limit) || 1;
        const targetPage = query.page > totalPages ? totalPages : query.page;

        query.setPage(targetPage);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? `Failed to remove whitelisted user: ${err.message}`
            : "Failed to remove whitelisted user",
        );
      }
    },
    [query.count, query.limit, query.page, query.setPage, queryClient],
  );

  return {
    whitelistUsers: query.users,
    whitelistCount: query.count,
    whitelistPage: query.page,
    setWhitelistPage: query.setPage,
    whitelistSearch: query.search,
    setWhitelistSearch: query.setSearch,
    isWhitelistLoading: query.isLoading,
    whitelistLimit: query.limit,
    userToDelete,
    setUserToDelete,
    fetchWhitelist: query.invalidate,
    handleSearchSubmit: query.handleSearchSubmit,
    confirmDeleteWhitelist,
  };
};
