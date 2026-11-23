import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type {
  AssignmentWithDetails,
  InterestWithDetails,
  ResponsibilityWithDetails,
  Service,
  UserListItem,
} from "@/types";

export type {
  AssignmentWithDetails,
  InterestWithDetails,
  ResponsibilityWithDetails,
  Service,
  UserListItem,
};

const fetchEnrichedData = async <
  T extends {
    user_id?: string | null;
    service_id?: number | null;
    started_at?: string | null;
    created_at?: string | null;
  },
>(
  storeName: string,
  dateField: "started_at" | "created_at" = "started_at",
): Promise<T[]> => {
  const db = await getDB();
  if (!db) return [];

  const [items, users, services] = await Promise.all([
    db.getAll(storeName) as Promise<T[]>,
    db.getAll(STORE.USERS),
    db.getAll(STORE.SERVICES),
  ]);

  const userMap = new Map(
    users.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]),
  );
  const serviceMap = new Map(
    services.map((s) => [s.id, { id: s.id, name: s.name }]),
  );

  const enriched = items.map((item) => ({
    ...item,
    users: item.user_id ? userMap.get(item.user_id) || null : null,
    services: item.service_id ? serviceMap.get(item.service_id) || null : null,
  })) as unknown as T[];

  return enriched.sort((a, b) => {
    const dateValA = a[dateField];
    const dateValB = b[dateField];
    const dateA = dateValA ? new Date(dateValA).getTime() : 0;
    const dateB = dateValB ? new Date(dateValB).getTime() : 0;
    return dateB - dateA;
  });
};

export const useServicesList = () =>
  useQuery({
    queryKey: [STORE.SERVICES],
    queryFn: async (): Promise<Service[]> => {
      const db = await getDB();
      if (!db) return [];
      const data = await db.getAll(STORE.SERVICES);
      return data.sort((a, b) => (a.order_ind ?? 0) - (b.order_ind ?? 0));
    },
  });

export const useServiceAssignments = () =>
  useQuery({
    queryKey: [STORE.USER_SERVICE_ASSIGNMENTS],
    queryFn: () =>
      fetchEnrichedData<AssignmentWithDetails>(
        STORE.USER_SERVICE_ASSIGNMENTS,
        "started_at",
      ),
  });

export const useServiceInterests = () =>
  useQuery({
    queryKey: [STORE.USER_SERVICE_INTERESTS],
    queryFn: () =>
      fetchEnrichedData<InterestWithDetails>(
        STORE.USER_SERVICE_INTERESTS,
        "created_at",
      ),
  });

export const useUserResponsibilities = () =>
  useQuery({
    queryKey: [STORE.USER_RESPONSIBILITIES],
    queryFn: () =>
      fetchEnrichedData<ResponsibilityWithDetails>(
        STORE.USER_RESPONSIBILITIES,
        "started_at",
      ),
  });

export const useUsersList = () =>
  useQuery({
    queryKey: [STORE.USERS],
    queryFn: async (): Promise<UserListItem[]> => {
      const db = await getDB();
      if (!db) return [];
      const users = await db.getAll(STORE.USERS);
      return users
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role_id: u.role_id,
        }))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    },
  });
