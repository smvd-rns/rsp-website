"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Forward,
  Maximize2,
  MessageSquare,
  Minimize2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  createQueryReply,
  updateQueryStatus,
} from "@/app/actions/query-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { sendRealtimeBroadcast } from "@/lib/realtime-utils";
import { toast } from "@/lib/toast";
import {
  formatRelativeTime,
  normalizeForwardHistory,
  triggerSync,
} from "@/lib/utils";
import type {
  QueryAttachment,
  QueryReplyWithUser,
  UserQueryWithUser,
} from "@/types";
import { AttachmentList } from "./attachment-list";
import { AttachmentPicker } from "./attachment-picker";
import { ForwardQueryDialog } from "./forward-query-dialog";
import {
  categoryLabels,
  type QueryCategory,
  type QueryStatus,
  statusColors,
} from "./query-constants";
import { QueryMarkdown } from "./query-markdown";
import {
  QueryReplyEditor,
  type QueryReplyEditorRef,
} from "./query-reply-editor";

interface QueryDetailClientProps {
  query: UserQueryWithUser;
  replies: QueryReplyWithUser[];
  onBack?: () => void;
  showBackLink?: boolean;
}

export const QueryDetailClient = ({
  query,
  replies,
  onBack,
  showBackLink = true,
}: QueryDetailClientProps) => {
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<QueryAttachment[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const replyEditorRef = useRef<QueryReplyEditorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateQueryStatus(query.id, newStatus as QueryStatus);
      if (res.success) {
        toast.success(`Ticket status updated to ${newStatus}`);

        const db = await getDB();
        if (db) {
          const q = await db.get(STORE.USER_QUERIES, query.id);
          if (q) {
            q.status = newStatus;
            await db.put(STORE.USER_QUERIES, q);
          }
        }

        queryClient.invalidateQueries({ queryKey: [STORE.USER_QUERIES] });
        triggerSync();

        // Broadcast sync notification to the user
        if (query.user_id) {
          sendRealtimeBroadcast(`user-channel-${query.user_id}`, "sync", {
            tables: [STORE.USER_QUERIES],
          });
        }
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const handleSendReply = (markdown: string) => {
    if (!markdown.trim() && attachments.length === 0) return;

    startTransition(async () => {
      const res = await createQueryReply(
        query.id,
        markdown.trim(),
        attachments,
        query.status,
      );
      if (res.success) {
        toast.success("Reply posted successfully");
        setAttachments([]);
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_QUERIES],
        });
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_QUERIES, query.id],
        });
        triggerSync();

        // Broadcast sync notification to the user
        if (query.user_id) {
          sendRealtimeBroadcast(`user-channel-${query.user_id}`, "sync", {
            tables: [STORE.QUERY_REPLIES, STORE.USER_QUERIES],
          });
        }
      } else {
        toast.error(res.error || "Failed to send reply");
      }
    });
  };

  const senderName = query.users?.name || query.guest_name || "Guest";
  const senderEmail = query.users?.email || query.guest_email || "";
  const forwardHistory = normalizeForwardHistory(query.forward_history);

  return (
    <div
      ref={containerRef}
      className="space-y-6 w-full bg-background p-4 overflow-y-auto"
    >
      {/* Top Bar with Back action & Status Selector */}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="cursor-pointer gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tickets</span>
          </Button>
        ) : showBackLink ? (
          <Link href="/queries" prefetch={false}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Tickets</span>
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {/* Action Buttons & Status Dropdown */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForwardOpen(true)}
            className="h-8 text-xs gap-1.5 cursor-pointer font-semibold"
          >
            <Forward className="h-3.5 w-3.5 text-primary" />
            <span>Forward Query</span>
          </Button>

          {forwardHistory.length > 0 && (
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onMouseEnter={() => setHistoryOpen(true)}
                  onMouseLeave={() => setHistoryOpen(false)}
                  onClick={() => setHistoryOpen((prev) => !prev)}
                  className="cursor-pointer inline-flex items-center"
                >
                  <Badge
                    variant="secondary"
                    className="h-8 px-2.5 gap-1.5 text-xs font-medium bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 transition-colors"
                  >
                    <Forward className="h-3 w-3 text-primary shrink-0" />
                    <span>
                      Forwarded {forwardHistory.length}{" "}
                      {forwardHistory.length === 1 ? "time" : "times"}
                    </span>
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-80 sm:w-96 p-0 overflow-hidden shadow-lg border-border"
                onMouseEnter={() => setHistoryOpen(true)}
                onMouseLeave={() => setHistoryOpen(false)}
              >
                <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                    <Forward className="h-3.5 w-3.5 text-primary" />
                    <span>Forwarding History ({forwardHistory.length})</span>
                  </div>
                  <Badge variant="outline" className="text-xxs font-normal">
                    {forwardHistory.length === 1
                      ? "1 forward"
                      : `${forwardHistory.length} forwards`}
                  </Badge>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60 p-0 text-xs">
                  {forwardHistory.map((record, idx) => {
                    const forwarder =
                      record.forwarded_by_name ||
                      record.forwarded_by_email ||
                      "Administrator";
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: ok
                        key={`${record.forwarded_at}-${idx}`}
                        className="p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-muted-foreground text-xxs">
                          <span className="font-semibold text-foreground">
                            {forwarder}
                          </span>
                          <span>{formatRelativeTime(record.forwarded_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xxs text-muted-foreground">
                            To:
                          </span>
                          {record.forwarded_to.map((email) => (
                            <Badge
                              key={email}
                              variant="outline"
                              className="text-xxs font-mono py-0 px-1 bg-muted/60"
                            >
                              {email}
                            </Badge>
                          ))}
                        </div>
                        {record.note && (
                          <div className="bg-muted/40 border border-border/50 rounded p-1.5 text-xxs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            <span className="font-semibold text-muted-foreground block text-[10px]">
                              Note:
                            </span>
                            {record.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 cursor-pointer"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>

          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider ml-1">
            Status:
          </span>
          <Select
            value={query.status}
            onValueChange={handleStatusChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs font-semibold cursor-pointer">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ticket Details */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                  {query.subject}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`${statusColors[query.status as QueryStatus] || ""} capitalize text-xs`}
                >
                  {(query.status || "").replace("_", " ")}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>
                  By {senderName} {senderEmail ? `(${senderEmail})` : ""}
                </span>
                <span>•</span>
                <span>
                  Submitted {formatRelativeTime(query.created_at || "")}
                </span>
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="font-semibold text-xs h-fit self-start shrink-0"
            >
              {categoryLabels[query.category as QueryCategory] ||
                query.category}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-3">
          <QueryMarkdown
            content={query.message}
            className="p-3.5 rounded-lg bg-muted/30 border border-border/40"
          />
          <AttachmentList
            attachments={query.attachments as unknown as QueryAttachment[]}
          />
        </CardContent>
      </Card>

      {/* Discussion Thread */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground pl-1 uppercase tracking-wider">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Discussion Thread ({replies.length})</span>
        </h3>

        {replies.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
            No replies yet. Use the rich editor below to post an answer.
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const isAdminReply = reply.user_id !== null;
              const replierName = reply.users?.name || "Support Team";

              return (
                <div
                  key={reply.id}
                  className={`flex flex-col rounded-lg border p-3.5 max-w-[90%] transition-colors ${
                    isAdminReply
                      ? "ml-auto bg-primary/5 border-primary/20"
                      : "bg-muted/40 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {replierName}
                      {isAdminReply && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary font-mono text-[10px] px-1.5 py-0"
                        >
                          Admin
                        </Badge>
                      )}
                    </span>
                    <span className="text-xxs text-muted-foreground">
                      {formatRelativeTime(reply.updated_at || "")}
                    </span>
                  </div>

                  <QueryMarkdown content={reply.message} />
                  <AttachmentList
                    attachments={
                      reply.attachments as unknown as QueryAttachment[]
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Composer with TipTap + Mentions */}
      {query.status === "closed" ? (
        <Card className="bg-muted/40 border-border">
          <CardContent className="flex items-center gap-2 justify-center py-6 text-muted-foreground text-xs">
            <ShieldAlert className="h-4 w-4" />
            <span>
              This ticket is closed. Re-open it using the status picker above to
              write replies.
            </span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Compose Reply
          </h4>
          <QueryReplyEditor
            ref={replyEditorRef}
            onSend={handleSendReply}
            sending={isPending}
            hasAttachments={attachments.length > 0}
          />
          <AttachmentPicker
            attachments={attachments}
            onChange={setAttachments}
            disabled={isPending}
            onTriggerMention={() => replyEditorRef.current?.openMentionDialog()}
            onTriggerLink={() => replyEditorRef.current?.openLinkDialog()}
          />
        </div>
      )}

      {/* Forward Query Email Dialog */}
      <ForwardQueryDialog
        query={query}
        open={forwardOpen}
        onOpenChange={setForwardOpen}
      />
    </div>
  );
};
