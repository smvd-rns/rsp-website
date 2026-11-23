import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { ActiveUser, WhitelistUser } from "../types";

export type UserQueryFilter<T> = (item: T, search: string) => boolean;

export const fetchPaginatedUserList = async <
  T extends {
    role_id?: number | null;
    created_at?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  },
>(
  storeName: string,
  page: number,
  search: string,
  limit: number,
  filterFn?: UserQueryFilter<T>,
  roleFilter?: string,
): Promise<{ users: T[]; count: number }> => {
  // If querying active users, fetch from live self-hosted PostgreSQL endpoint
  if (storeName === STORE.USERS) {
    try {
      const roleParam = roleFilter && roleFilter !== "all" ? `&role=${encodeURIComponent(roleFilter)}` : "";
      const res = await fetch(
        `/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${roleParam}`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.users) {
          return { users: json.users as T[], count: Number(json.count || 0) };
        }
      }
    } catch (err) {
      console.warn("[fetchPaginatedUserList] Live fetch fallback to idb:", err);
    }
  }

  const db = await getDB();
  if (!db) return { users: [], count: 0 };

  let items = (await db.getAll(storeName)) as T[];

  if (search.trim()) {
    const s = search.trim().toLowerCase();
    if (filterFn) {
      items = items.filter((item) => filterFn(item, s));
    } else {
      items = items.filter(
        (item) =>
          item.email?.toLowerCase().includes(s) ||
          item.name?.toLowerCase().includes(s) ||
          item.phone?.toLowerCase().includes(s),
      );
    }
  }

  if (roleFilter && roleFilter !== "all") {
    items = items.filter((item) => String(item.role_id) === String(roleFilter));
  }

  items.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dbTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dbTime - da;
  });

  const count = items.length;
  const from = (page - 1) * limit;
  const sliced = items.slice(from, from + limit);

  const roles = await db.getAll(STORE.ROLES);
  const rolesMap = new Map(roles.map((r) => [r.id, r.name]));

  const mapped = sliced.map((u) => ({
    ...u,
    roles: u.role_id ? { name: rolesMap.get(u.role_id) || "User" } : null,
  })) as unknown as T[];

  return { users: mapped, count };
};

export const useUserTableQuery = <T extends ActiveUser | WhitelistUser>(
  storeName: string,
  filterFn?: UserQueryFilter<T>,
  initialLimit: number = 10,
) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimitState] = useState(initialLimit);
  const [roleFilter, setRoleFilterState] = useState<string>("all");
  const queryClient = useQueryClient();

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  const setRoleFilter = useCallback((newRole: string) => {
    setRoleFilterState(newRole);
    setPage(1);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: [storeName, page, search, limit, roleFilter],
    queryFn: () =>
      fetchPaginatedUserList<T>(storeName, page, search, limit, filterFn, roleFilter),
    staleTime: 30000,
  });

  const users = data?.users ?? [];
  const count = data?.count ?? 0;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [storeName] });
  }, [queryClient, storeName]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e?.preventDefault?.();
      setPage(1);
      invalidate();
    },
    [invalidate],
  );

  return {
    users,
    count,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    limit,
    setLimit,
    roleFilter,
    setRoleFilter,
    invalidate,
    handleSearchSubmit,
  };
};
