import { STORE } from "@/constants";
import type { ActiveUser } from "../types";
import { useUserTableQuery } from "./use-user-table-query";

export const useActiveUsers = () => {
  const query = useUserTableQuery<ActiveUser>(STORE.USERS, undefined, 10);

  return {
    activeUsers: query.users,
    activeCount: query.count,
    activePage: query.page,
    setActivePage: query.setPage,
    activeSearch: query.search,
    setActiveSearch: query.setSearch,
    isActiveLoading: query.isLoading,
    activeLimit: query.limit,
    setActiveLimit: query.setLimit,
    activeRoleFilter: query.roleFilter,
    setActiveRoleFilter: query.setRoleFilter,
    fetchActiveUsers: query.invalidate,
    handleActiveSearchSubmit: query.handleSearchSubmit,
    isLoading: query.isLoading,
    invalidate: query.invalidate,
  };
};
