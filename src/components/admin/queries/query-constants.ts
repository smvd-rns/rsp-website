export type QueryStatus = "open" | "in_progress" | "resolved" | "closed";

export type QueryCategory =
  | "technical_issue"
  | "content_feedback"
  | "volunteering_inquiry"
  | "spiritual_query"
  | "general";

export const statusColors: Record<QueryStatus, string> = {
  open: "bg-danger/5 text-danger border-danger/20 ",
  in_progress: "bg-info/5 text-info border-info/20 ",
  resolved: "bg-success/5 text-success border-success/20 ",
  closed: "bg-muted text-foreground/80 border-border ",
};

export const categoryLabels: Record<QueryCategory, string> = {
  technical_issue: "Technical Issue",
  content_feedback: "Content Feedback",
  volunteering_inquiry: "Volunteering Inquiry",
  spiritual_query: "Spiritual Query",
  general: "General Query",
};
