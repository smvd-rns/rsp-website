import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import type { Role } from "@/types";

export const ROLES_QUERY_KEY = [STORE.ROLES];

const DEFAULT_ROLES: Role[] = [
  { id: 1, name: "Administrator" },
  { id: 2, name: "Student" },
  { id: 3, name: "Leader" },
  { id: 4, name: "Brahmacari" },
  { id: 5, name: "BVP" },
  { id: 6, name: "Visitor" },
  { id: 7, name: "aspBrahmacari" },
  { id: 8, name: "Manager" },
];

export const useRoles = () => {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async (): Promise<Role[]> => {
      // 1. Try live API
      try {
        const res = await fetch("/api/admin/roles");
        if (res.ok) {
          const json = await res.json();
          if (json?.roles && Array.isArray(json.roles) && json.roles.length > 0) {
            return json.roles as Role[];
          }
        }
      } catch (e) {
        console.warn("[useRoles] Live fetch failed, trying IndexedDB:", e);
      }

      // 2. Try IndexedDB
      try {
        const db = await getDB();
        if (db) {
          const roles = await db.getAll(STORE.ROLES);
          if (roles && roles.length > 0) {
            return (roles as Role[]).sort((a, b) => a.id - b.id);
          }
        }
      } catch (e) {
        console.warn("[useRoles] IDB fetch failed:", e);
      }

      // 3. Fallback to default roles
      return DEFAULT_ROLES;
    },
    staleTime: 60_000,
  });
};
