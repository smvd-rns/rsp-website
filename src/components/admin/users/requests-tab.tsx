"use client";

import { CheckCircle2, Clock, Edit, Info } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequests } from "./hooks/use-requests";
import { ReviewRequestDialog } from "./review-request-dialog";
import type { UserEditRequestWithUser } from "./types";

const STATUS_BADGES: Record<
  string,
  {
    className: string;
    icon: React.ReactNode;
    label: string;
    variant?: "destructive" | "secondary";
  }
> = {
  approved: {
    className: "bg-success/10 text-success hover:bg-success/10",
    icon: <span className="mr-1 h-3 w-3">✓</span>,
    label: "Approved",
  },
  rejected: {
    className: "",
    icon: <span className="mr-1 h-3 w-3">✗</span>,
    label: "Rejected",
    variant: "destructive",
  },
  pending: {
    className: "bg-warning/10 text-warning hover:bg-warning/10",
    icon: <Clock className="mr-1 h-3 w-3 animate-pulse" />,
    label: "Pending",
    variant: "secondary",
  },
};

interface RequestsTabProps {
  onStatusUpdated: () => void;
}

export const RequestsTab = ({ onStatusUpdated }: RequestsTabProps) => {
  const { requests, isLoading, handleAction } = useRequests(onStatusUpdated);
  const [selectedRequest, setSelectedRequest] =
    useState<UserEditRequestWithUser | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_BADGES[status] || STATUS_BADGES.pending;
    return (
      <Badge className={cfg.className} variant={cfg.variant}>
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const openReview = (req: UserEditRequestWithUser) => {
    setSelectedRequest(req);
    setIsReviewOpen(true);
  };

  const openRequests = requests.filter((req) => req.status === "pending");
  const resolvedRequests = requests.filter(
    (req) => req.status === "approved" || req.status === "rejected",
  );

  const renderRequestItem = (req: UserEditRequestWithUser) => {
    return (
      <AccordionItem
        value={req.id}
        key={req.id}
        className="border border-border/60 rounded-lg px-4 bg-card shadow-sm"
      >
        <AccordionTrigger className="hover:no-underline py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left w-full">
            <span className="text-xs text-muted-foreground shrink-0 min-w-[70px]">
              {req.requested_at
                ? new Date(req.requested_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "-"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {req.users?.email || "Unknown"}
              </span>
              {req.name && (
                <span className="text-xs text-muted-foreground">
                  {req.name}
                </span>
              )}
            </div>
            {req.roles?.name && (
              <Badge
                variant="secondary"
                className="capitalize text-[10px] py-0.5 px-2 bg-warning/5 text-warning font-medium w-fit sm:ml-2"
              >
                {req.roles.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 mr-2">
            {getStatusBadge(req.status)}
            {req.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5 h-8 text-warning hover:text-warning hover:bg-warning/5 border-warning/20"
                onClick={(e) => {
                  e.stopPropagation();
                  openReview(req);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
                Review
              </Button>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/40 pt-4 mt-1">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Profile Details
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">
                      Full Name
                    </span>
                    <span className="font-medium text-foreground">
                      {req.name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Phone</span>
                    <span className="font-medium text-foreground">
                      {req.phone || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ashram</span>
                    <span className="font-medium text-foreground">
                      {req.ashram || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Temple</span>
                    <span className="font-medium text-foreground">
                      {req.temple || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {req.purpose && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Purpose of Registration
                  </h4>
                  <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-md border border-border/20 whitespace-pre-wrap">
                    {req.purpose}
                  </p>
                </div>
              )}

              {req.reason && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Stated Reason for Update
                  </h4>
                  <div className="p-2.5 rounded-md bg-warning/5 border border-warning/10 text-warning italic text-xs flex gap-2 items-start">
                    <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <div>&ldquo;{req.reason}&rdquo;</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Authority / Guardian Info
                </h4>
                {req.authority_name ||
                req.authority_relationship ||
                req.authority_email ? (
                  <div className="grid grid-cols-1 gap-y-2 text-xs bg-muted/30 p-3 rounded-md border border-border/20">
                    <div>
                      <span className="text-muted-foreground block">
                        Name & Relationship
                      </span>
                      <span className="font-medium text-foreground">
                        {req.authority_name || "-"}
                        {req.authority_relationship
                          ? ` (${req.authority_relationship})`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Email</span>
                      <span className="font-medium text-foreground">
                        {req.authority_email || "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No authority info provided
                  </p>
                )}
              </div>

              {req.status !== "pending" && (
                <div className="border-t border-border/40 pt-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Review Decision
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-muted-foreground block">
                          Reviewed At
                        </span>
                        <span className="font-medium text-foreground">
                          {req.reviewed_at
                            ? new Date(req.reviewed_at).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          Reviewed By
                        </span>
                        <span className="font-medium text-foreground">
                          {req.reviewer?.email || "System/Admin"}
                        </span>
                      </div>
                    </div>
                    {req.review_comment && (
                      <div>
                        <span className="text-muted-foreground block mb-1">
                          Reviewer Comment
                        </span>
                        <p className="p-2.5 rounded-md bg-muted/40 border border-border/20 text-foreground whitespace-pre-wrap">
                          {req.review_comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <>
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>User Requests</CardTitle>
          <CardDescription>
            Review and manage profile edit or role assignment requests submitted
            by users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="open" className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Open Requests ({openRequests.length})
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Resolved ({resolvedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-4 outline-none">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading requests...
                </div>
              ) : openRequests.length > 0 ? (
                <Accordion
                  type="single"
                  collapsible
                  className="w-full space-y-2"
                >
                  {openRequests.map((req) => renderRequestItem(req))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20 py-12">
                  No pending requests.
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4 outline-none">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading requests...
                </div>
              ) : resolvedRequests.length > 0 ? (
                <Accordion
                  type="single"
                  collapsible
                  className="w-full space-y-2"
                >
                  {resolvedRequests.map((req) => renderRequestItem(req))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20 py-12">
                  No resolved requests.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ReviewRequestDialog
        request={selectedRequest}
        isOpen={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        onApprove={(id, userId, edits) =>
          handleAction(id, "approved", userId, edits)
        }
        onReject={(id, userId, edits) =>
          handleAction(id, "rejected", userId, edits)
        }
      />
    </>
  );
};
