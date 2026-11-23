"use client";

import { Check, Edit, Loader2, Mail, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  adminCreateUser,
  adminDeleteActiveUser,
} from "@/app/actions/user-actions";
import { buildAdminUserPayload } from "@/components/admin/users/user-utils";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "@/lib/toast";
import type { Role } from "@/types";
import type { ActiveUser, WhitelistUser } from "./types";
import {
  getRoleVisuals,
  UserFormFields,
  UserRoleSelectField,
} from "./user-form-fields";

interface EditUserDialogProps {
  user: ActiveUser | WhitelistUser | null;
  roles?: Role[];
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onSaved?: () => void;
  onUserUpdated?: () => void;
  onDeleted?: () => void;
}

export const EditUserDialog = ({
  user,
  roles: propRoles,
  isOpen,
  onOpenChange,
  onClose,
  onSaved,
  onUserUpdated,
  onDeleted,
}: EditUserDialogProps) => {
  const { data: hookRoles } = useRoles();
  const roles = propRoles ?? hookRoles;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    ashram: "",
    temple: "",
    purpose: "",
    authorityName: "",
    authorityRelationship: "",
    authorityEmail: "",
    roleId: "",
  });

  useEffect(() => {
    if (user) {
      let authRel = user.authority_relationship || "";
      let authEmail = user.authority_email || "";

      // Normalize if database had email stored in relationship and relationship in email
      if (authRel.includes("@") && !authEmail?.includes("@")) {
        const temp = authEmail;
        authEmail = authRel;
        authRel = temp;
      }

      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        ashram: user.ashram || "",
        temple: user.temple || "",
        purpose: user.purpose || "",
        authorityName: user.authority_name || "",
        authorityRelationship: authRel,
        authorityEmail: authEmail,
        roleId: user.role_id?.toString() || "",
      });
    }
  }, [user]);

  const handleClose = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    if (!open && onClose) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    toast.info("Saving changes...");
    try {
      const res = await adminCreateUser(
        buildAdminUserPayload(user.email, formData, true),
      );

      if (res.success) {
        toast.success("User details updated successfully!");
        handleClose(false);
        if (onSaved) onSaved();
        if (onUserUpdated) onUserUpdated();
      } else {
        toast.error("Failed to update user");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteActiveUser(user.id, user.email);
      if (res.success) {
        toast.success(`User ${user.email} deleted successfully.`);
        setShowDeleteConfirm(false);
        handleClose(false);
        if (onDeleted) onDeleted();
        if (onSaved) onSaved();
        if (onUserUpdated) onUserUpdated();
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

  const currentRoleName =
    user?.roles?.name ||
    roles?.find((r) => r.id === user?.role_id)?.name ||
    "User";
  const roleVisuals = getRoleVisuals(currentRoleName);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          maxW="52rem"
          className="sm:max-w-3xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl border-border/80 shadow-2xl"
        >
          {/* Header Section */}
          <div className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                  <Edit className="size-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Edit User Profile
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Update role and profile details for {user?.email}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* User Quick Identity Pill */}
            {user && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs uppercase shrink-0">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {user.name || "Unnamed Account"}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[11px] px-2.5 py-0.5 font-medium shrink-0 ${roleVisuals.badgeClass}`}
                >
                  <Shield className="size-3 mr-1" />
                  {currentRoleName}
                </Badge>
              </div>
            )}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/10 p-3 shadow-2xs">
              <UserRoleSelectField
                value={formData.roleId}
                onChange={(val) => setFormData({ ...formData, roleId: val })}
                roles={roles}
                label="Assigned Role"
              />
            </div>

            <UserFormFields formData={formData} onChange={setFormData} />

            <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between sm:justify-between w-full gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting || isDeleting}
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Account</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting || isDeleting}
                  className="rounded-xl h-9 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="rounded-xl h-9 px-5 gap-2 shadow-2xs text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5 stroke-[2.5]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) =>
          !open && !isDeleting && setShowDeleteConfirm(false)
        }
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
                  Are you sure you want to permanently delete this user account?
                </AlertDialogDescription>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Devotee: </span>
                <span className="font-semibold text-foreground">
                  {user?.name || "Unnamed"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-semibold text-foreground">
                  {user?.email}
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
                handleDeleteUser();
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
