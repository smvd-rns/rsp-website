"use client";

import { Trash2 } from "lucide-react";
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
import type { useWhitelist } from "./hooks/use-whitelist";
import type { WhitelistUser } from "./types";
import { UserTableShell } from "./user-table-shell";

interface WhitelistTabProps {
  whitelistHook: ReturnType<typeof useWhitelist>;
}

export const WhitelistTab = ({ whitelistHook }: WhitelistTabProps) => {
  const {
    whitelistUsers,
    whitelistCount,
    whitelistPage,
    setWhitelistPage,
    whitelistSearch,
    setWhitelistSearch,
    isWhitelistLoading,
    userToDelete,
    setUserToDelete,
    whitelistLimit,
    handleSearchSubmit,
    confirmDeleteWhitelist,
  } = whitelistHook;

  return (
    <>
      <UserTableShell<WhitelistUser>
        title="Whitelisted Users"
        description="Emails pre-approved to join the application. They can sign up and will receive their pre-assigned roles."
        searchPlaceholder="Search by email..."
        search={whitelistSearch}
        onSearchChange={setWhitelistSearch}
        onSearchSubmit={handleSearchSubmit}
        isLoading={isWhitelistLoading}
        users={whitelistUsers}
        count={whitelistCount}
        page={whitelistPage}
        limit={whitelistLimit}
        onPageChange={setWhitelistPage}
        dateColumnHeader="Whitelisted At"
        emptyMessage="No whitelisted users found."
        renderActions={(user) => (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/5"
            onClick={() => setUserToDelete(user.email)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Whitelist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{userToDelete}</strong> from
              the whitelist? They will not be able to log in or create an
              account until whitelisted again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={() =>
                userToDelete && confirmDeleteWhitelist(userToDelete)
              }
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
