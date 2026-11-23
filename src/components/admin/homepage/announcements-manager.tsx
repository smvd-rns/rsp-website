"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Edit2,
  Eye,
  EyeOff,
  Plus,
  Repeat,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteAnnouncement,
  reorderAnnouncements,
  updateAnnouncement,
} from "@/app/actions/homepage-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STORE } from "@/constants";
import { useRoles } from "@/hooks/use-roles";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { Announcement } from "@/types";

interface AnnouncementsManagerProps {
  announcements: Announcement[];
}

export const AnnouncementsManager = ({
  announcements: initialAnnouncements,
}: AnnouncementsManagerProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: roles = [] } = useRoles();
  const [isPending, startTransition] = useTransition();

  const sortedAnnouncements = [...initialAnnouncements].sort(
    (a, b) => (a.order_ind || 0) - (b.order_ind || 0),
  );

  const handleAddAnnouncement = () => {
    router.push("/homepage/announcements/new");
  };

  const handleEditAnnouncement = (item: Announcement) => {
    router.push(`/homepage/announcements/${item.id}`);
  };

  const handleDeleteAnnouncement = (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this announcement banner? Associated media files will also be removed.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        const db = await getDB();
        if (db) {
          await db.delete(STORE.ANNOUNCEMENTS, id);
        }
        toast.success("Announcement deleted successfully");
        triggerSync([STORE.ANNOUNCEMENTS]);
        queryClient.invalidateQueries({ queryKey: [STORE.ANNOUNCEMENTS] });
        queryClient.invalidateQueries({
          queryKey: [STORE.FEATURED_SECTIONS, STORE.ANNOUNCEMENTS],
        });
      } else {
        toast.error(res.error || "Failed to delete announcement");
      }
    });
  };

  const handleToggleActive = (item: Announcement) => {
    startTransition(async () => {
      const res = await updateAnnouncement(item.id, {
        title: item.title,
        subtitle: item.subtitle,
        badge_text: item.badge_text,
        category: item.category || "event",
        cta_label: item.cta_label,
        cta_url: item.cta_url,
        bg_gradient: item.bg_gradient,
        start_date: item.start_date,
        end_date: item.end_date,
        is_annual_recurring: item.is_annual_recurring ?? false,
        is_active: !item.is_active,
        media_type: item.media_type || "image",
      });

      if (res.success) {
        toast.success(
          item.is_active
            ? "Announcement deactivated (hidden from site)"
            : "Announcement activated successfully",
        );
        triggerSync([STORE.ANNOUNCEMENTS]);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedAnnouncements.length) return;

    const list = [...sortedAnnouncements];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const payload = list.map((item, idx) => ({
      id: item.id,
      order_ind: idx,
    }));

    startTransition(async () => {
      const res = await reorderAnnouncements(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to reorder announcements");
      } else {
        triggerSync([STORE.ANNOUNCEMENTS]);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              Top Banner Announcements & Campaigns
            </CardTitle>
            <CardDescription>
              Promote upcoming festivals, Utkarsh camps, yatras, fundraising
              drives, book marathons, and guidance spotlights.
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleAddAnnouncement}>
            <Plus className="h-4 w-4 mr-2" />
            Add Announcement Banner
          </Button>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {sortedAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
              No announcement banners configured yet. Click "Add Announcement
              Banner" above.
            </div>
          ) : (
            sortedAnnouncements.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 border border-border rounded-xl bg-card shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-input"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground text-base">
                      {item.title ||
                        item.subtitle ||
                        item.badge_text ||
                        "Untitled Banner"}
                    </span>
                    {item.badge_text && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge_text}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs uppercase">
                      {item.category?.replace("_", " ") || "event"}
                    </Badge>
                    {item.is_annual_recurring && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-500/10 text-amber-600 flex items-center gap-1"
                      >
                        <Repeat className="w-3 h-3" />
                        Annual Recurring
                      </Badge>
                    )}
                    {!item.is_active && (
                      <Badge
                        variant="destructive"
                        className="text-xs flex items-center gap-1"
                      >
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </Badge>
                    )}
                    {item.allowed_roles && item.allowed_roles.length > 0 ? (
                      item.allowed_roles.map((rId) => {
                        const rName =
                          roles.find((r) => r.id === rId)?.name ||
                          `Role ${rId}`;
                        return (
                          <Badge
                            key={rId}
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary border-primary/20"
                          >
                            {rName}
                          </Badge>
                        );
                      })
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        Public (All Roles)
                      </Badge>
                    )}
                  </div>

                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {(item.start_date || item.end_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {item.start_date || "Anytime"} →{" "}
                        {item.end_date || "Ongoing"}
                      </span>
                    )}
                    {item.cta_label && (
                      <span>
                        CTA:{" "}
                        <strong className="text-foreground">
                          {item.cta_label}
                        </strong>{" "}
                        ({item.cta_url || "#"})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(item)}
                    disabled={isPending}
                    title={item.is_active ? "Hide on Site" : "Show on Site"}
                  >
                    {item.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAnnouncement(item)}
                    title="Edit Banner"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0 || isPending}
                    title="Move Up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleMove(idx, "down")}
                    disabled={
                      idx === sortedAnnouncements.length - 1 || isPending
                    }
                    title="Move Down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    title="Delete Banner"
                    disabled={isPending}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
