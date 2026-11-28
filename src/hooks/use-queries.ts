import { useQuery } from "@tanstack/react-query";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import {
  normalizeForwardHistory,
  normalizeQueryAttachments,
} from "@/lib/utils";
import type { QueryReplyWithUser, UserQueryWithUser } from "@/types";
export const useQueries = () =>
  useQuery({
    queryKey: [STORE.USER_QUERIES],
    queryFn: async (): Promise<UserQueryWithUser[]> => {
      try {
        const res = await fetch("/api/admin/queries");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            const db = await getDB();
            if (db) {
              for (const q of json.data) {
                await db.put(STORE.USER_QUERIES, {
                  id: q.id,
                  user_id: q.user_id,
                  guest_email: q.guest_email,
                  guest_name: q.guest_name,
                  subject: q.subject,
                  message: q.message,
                  category: q.category,
                  status: q.status,
                  attachments: q.attachments,
                  forward_history: q.forward_history,
                  created_at: q.created_at,
                  updated_at: q.updated_at,
                });
              }
            }
            return json.data as UserQueryWithUser[];
          }
        }
      } catch {
        // Fallback to IndexedDB when offline or non-admin
      }

      const db = await getDB();
      if (!db) return [];
      const [queries, users] = await Promise.all([
        db.getAll(STORE.USER_QUERIES),
        db.getAll(STORE.USERS),
      ]);
      const userMap = new Map(
        users.map((u) => [u.id, { name: u.name, email: u.email }]),
      );
      const mapped = queries.map((q) => ({
        id: q.id,
        user_id: q.user_id,
        guest_email: q.guest_email,
        guest_name: q.guest_name,
        subject: q.subject,
        message: q.message,
        category: q.category as UserQueryWithUser["category"],
        status: q.status as UserQueryWithUser["status"],
        attachments: normalizeQueryAttachments(q.attachments),
        forward_history: normalizeForwardHistory(q.forward_history),
        created_at: q.created_at,
        updated_at: q.updated_at,
        users: q.user_id ? userMap.get(q.user_id) || null : null,
      }));
      return mapped.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    },
    staleTime: 30000,
  });

export const useQueryDetail = (id?: string | null) =>
  useQuery({
    queryKey: [STORE.USER_QUERIES, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{
      query: UserQueryWithUser;
      replies: QueryReplyWithUser[];
    } | null> => {
      if (!id) return null;
      const db = await getDB();
      if (!db) return null;

      const [qRow, allReplies, users] = await Promise.all([
        db.get(STORE.USER_QUERIES, id),
        db.getAll(STORE.QUERY_REPLIES),
        db.getAll(STORE.USERS),
      ]);

      if (!qRow) return null;
      const userMap = new Map(
        users.map((u) => [u.id, { name: u.name, email: u.email }]),
      );
      const query: UserQueryWithUser = {
        id: qRow.id,
        user_id: qRow.user_id,
        guest_email: qRow.guest_email,
        guest_name: qRow.guest_name,
        subject: qRow.subject,
        message: qRow.message,
        category: qRow.category as UserQueryWithUser["category"],
        status: qRow.status as UserQueryWithUser["status"],
        attachments: normalizeQueryAttachments(qRow.attachments),
        forward_history: normalizeForwardHistory(qRow.forward_history),
        created_at: qRow.created_at,
        updated_at: qRow.updated_at,
        users: qRow.user_id ? userMap.get(qRow.user_id) || null : null,
      };

      const replies = allReplies
        .filter((r) => r.query_id === id)
        .map((r) => ({
          id: r.id,
          query_id: r.query_id,
          user_id: r.user_id,
          message: r.message,
          attachments: normalizeQueryAttachments(r.attachments),
          updated_at: r.updated_at,
          users: r.user_id ? userMap.get(r.user_id) || null : null,
        }))
        .sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateA - dateB;
        });

      return {
        query,
        replies,
      };
    },
  });
