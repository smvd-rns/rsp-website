import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { updateUserEditRequestStatus } from "@/app/actions/user-actions";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { sendRealtimeBroadcast } from "@/lib/realtime-utils";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { UserEditRequestWithUser } from "../types";

const getRequests = async (): Promise<UserEditRequestWithUser[]> => {
  const db = await getDB();
  if (!db) return [];

  const [requests, users] = await Promise.all([
    db.getAll(STORE.USER_EDIT_REQUESTS),
    db.getAll(STORE.USERS),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  const roles = await db.getAll(STORE.ROLES);
  const rolesMap = new Map(roles.map((r) => [r.id, r.name]));

  const enriched = requests.map((req) => {
    const requestUser = req.user_id ? userMap.get(req.user_id) : null;
    const reviewerUser = req.reviewed_by ? userMap.get(req.reviewed_by) : null;

    return {
      ...req,
      users: requestUser ? { email: requestUser.email } : null,
      roles: req.requested_role_id
        ? { name: rolesMap.get(req.requested_role_id) || "User" }
        : null,
      reviewer: reviewerUser ? { email: reviewerUser.email } : null,
    };
  }) as UserEditRequestWithUser[];

  return enriched.sort((a, b) => {
    const da = a.requested_at ? new Date(a.requested_at).getTime() : 0;
    const db = b.requested_at ? new Date(b.requested_at).getTime() : 0;
    return db - da;
  });
};

const updateRequestStatus = async (
  id: string,
  action: "approved" | "rejected",
  edits?: Parameters<typeof updateUserEditRequestStatus>[2],
): Promise<void> => {
  await updateUserEditRequestStatus(id, action, edits);
};

export const useRequests = (onStatusUpdated?: () => void) => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: [STORE.USER_EDIT_REQUESTS],
    queryFn: getRequests,
  });

  const handleStatusUpdate = useCallback(
    async (
      id: string,
      action: "approved" | "rejected",
      userId: string,
      edits?: Parameters<typeof updateUserEditRequestStatus>[2],
    ) => {
      try {
        await updateRequestStatus(id, action, edits);
        toast.success(`Request ${action} successfully`);

        // Realtime broadcast to trigger instant session refresh for connected users
        sendRealtimeBroadcast(`user-channel-${userId}`, "sync", {
          tables: [STORE.USERS, STORE.USER_EDIT_REQUESTS],
        });

        // Trigger local client sync
        await triggerSync([STORE.USER_EDIT_REQUESTS, STORE.USERS]);

        queryClient.invalidateQueries({
          queryKey: [STORE.USER_EDIT_REQUESTS],
        });
        queryClient.invalidateQueries({ queryKey: [STORE.USERS] });

        onStatusUpdated?.();
      } catch (err: unknown) {
        console.error("Failed to update status:", err);
        toast.error((err as Error).message || "Failed to update status");
        throw err;
      }
    },
    [queryClient, onStatusUpdated],
  );

  return {
    requests,
    isLoading,
    updateStatus: handleStatusUpdate,
    handleAction: handleStatusUpdate,
  };
};
