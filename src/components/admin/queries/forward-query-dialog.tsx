"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Forward, Info, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { forwardQueryEmailAction } from "@/app/actions/query-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { normalizeForwardHistory, triggerSync } from "@/lib/utils";
import type { UserQueryWithUser } from "@/types";

interface ForwardQueryDialogProps {
  query: UserQueryWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForwardQueryDialog = ({
  query,
  open,
  onOpenChange,
}: ForwardQueryDialogProps) => {
  const queryClient = useQueryClient();
  const [recipientInput, setRecipientInput] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const enquirerName = query.users?.name || query.guest_name || "Enquirer";
  const enquirerEmail = query.users?.email || query.guest_email || "";

  const handleClose = () => {
    if (isPending) return;
    onOpenChange(false);
  };

  const handleForward = () => {
    const rawTokens = recipientInput
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (rawTokens.length === 0) {
      toast.error("Please enter at least one recipient email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = rawTokens.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email format: ${invalidEmails.join(", ")}`);
      return;
    }

    if (!enquirerEmail) {
      toast.error(
        "This inquiry does not have a sender email to set as replyTo.",
      );
      return;
    }

    startTransition(async () => {
      const res = await forwardQueryEmailAction({
        query,
        recipientEmails: rawTokens,
        note: note.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Inquiry forwarded to ${rawTokens.length} recipient${rawTokens.length > 1 ? "s" : ""}`,
        );

        if (res.forwardRecord) {
          const db = await getDB();
          if (db) {
            const q = await db.get(STORE.USER_QUERIES, query.id);
            if (q) {
              const existing = normalizeForwardHistory(q.forward_history);
              q.forward_history = [...existing, res.forwardRecord];
              await db.put(STORE.USER_QUERIES, q);
            }
          }
          queryClient.invalidateQueries({
            queryKey: [STORE.USER_QUERIES],
          });
          triggerSync([STORE.USER_QUERIES]);
        }

        setRecipientInput("");
        setNote("");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to forward inquiry");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] gap-4 p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Forward className="h-4 w-4 text-primary" />
            <span>Forward Query via Email</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Forward this ticket with a deep link to team members or counselors.
            Recipients can reply directly via email or use the Admin Dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Sender & Reply-To Context Banner */}
        <div className="bg-muted/40 border border-border/70 rounded-lg p-3 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-semibold text-foreground">Enquirer:</span>
            <span className="truncate max-w-[260px]">
              {enquirerName} {enquirerEmail ? `(${enquirerEmail})` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-semibold text-foreground">
              Reply-To Header:
            </span>
            <span className="text-primary font-mono text-[11px] truncate max-w-[260px]">
              {enquirerEmail || "No email available"}
            </span>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="recipient-emails"
              className="text-xs font-semibold text-foreground"
            >
              Recipient Email Address(es){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient-emails"
              type="text"
              placeholder="e.g. preacher@example.com, mentor@example.com"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              disabled={isPending}
              className="text-xs h-9"
              autoFocus
            />
            <span className="text-[11px] text-muted-foreground">
              Separate multiple email addresses with commas or spaces.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="forward-note"
              className="text-xs font-semibold text-foreground"
            >
              Administrator Note / Instructions{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="forward-note"
              placeholder="Add instructions or context for the recipient..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              className="text-xs min-h-[75px] resize-none"
            />
          </div>

          {/* Guidance Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 text-[11px] text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 leading-relaxed">
              <span>
                <strong>Reply Options for Recipient:</strong>
              </span>
              <span>
                &bull; <strong>Admin Dashboard:</strong> Recommended. Recipient
                can link lectures and materials via{" "}
                <code className="text-primary font-semibold">@</code> mentions.
              </span>
              <span>
                &bull; <strong>Direct Email Reply:</strong> Sent directly to the
                enquirer (will not update ticket in Admin Dashboard).
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleForward}
            disabled={isPending || !recipientInput.trim()}
            className="cursor-pointer text-xs gap-1.5 font-semibold"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Forward Email</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
