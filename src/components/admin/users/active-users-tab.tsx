"use client";

import { Edit, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminDeleteActiveUser } from "@/app/actions/user-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { EditUserDialog } from "./edit-user-dialog";
import type { useActiveUsers } from "./hooks/use-active-users";
import type { ActiveUser } from "./types";
import { UserTableShell } from "./user-table-shell";

interface ActiveUsersTabProps {
  activeUsersHook: ReturnType<typeof useActiveUsers>;
}

export const ActiveUsersTab = ({ activeUsersHook }: ActiveUsersTabProps) => {
  const {
    activeUsers,
    activeCount,
    activePage,
    setActivePage,
    activeSearch,
    setActiveSearch,
    isActiveLoading,
    activeLimit,
    setActiveLimit,
    activeRoleFilter,
    setActiveRoleFilter,
    fetchActiveUsers,
    handleActiveSearchSubmit,
  } = activeUsersHook;

  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ActiveUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditUser = (user: ActiveUser) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteActiveUser(
        userToDelete.id,
        userToDelete.email,
      );
      if (res.success) {
        toast.success(
          `User ${userToDelete.email} has been deleted successfully.`,
        );
        setUserToDelete(null);
        fetchActiveUsers();
      } else {
        toast.error("Failed to delete user account.");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user account.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <UserTableShell<ActiveUser>
        title="Active Application Users"
        description="View registered application users, search by email or name, and update their roles and profiles."
        searchPlaceholder="Search by email, name, phone..."
        search={activeSearch}
        onSearchChange={setActiveSearch}
        onSearchSubmit={handleActiveSearchSubmit}
        isLoading={isActiveLoading}
        users={activeUsers}
        count={activeCount}
        page={activePage}
        limit={activeLimit}
        onPageChange={setActivePage}
        onLimitChange={setActiveLimit}
        roleFilter={activeRoleFilter}
        onRoleFilterChange={setActiveRoleFilter}
        dateColumnHeader="Joined At"
        emptyMessage="No active users found."
        renderActions={(user) => (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => openEditUser(user)}
              title="Edit Devotee Role & Profile"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => setUserToDelete(user)}
              title="Delete Devotee Account"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <EditUserDialog
        user={selectedUser}
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={fetchActiveUsers}
        onDeleted={fetchActiveUsers}
      />

      {/* Delete User Confirmation Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl border-border/80 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Delete Devotee Account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Devotee: </span>
                <span className="font-semibold text-foreground">
                  {userToDelete?.name || "Unnamed"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-semibold text-foreground">
                  {userToDelete?.email}
                </span>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteUser();
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Delete Account</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
