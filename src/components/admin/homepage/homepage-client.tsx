"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Eye,
  EyeOff,
  LayoutGrid,
  Megaphone,
  Plus,
  Trash,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  deleteFeaturedItem,
  deleteFeaturedSection,
  reorderFeaturedItems,
  reorderFeaturedSections,
  updateFeaturedSection,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STORE } from "@/constants";
import { useRoles } from "@/hooks/use-roles";
import { getDB } from "@/lib/idb";
import { swapAndReorder } from "@/lib/reorder-utils";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { Announcement } from "@/types";
import { AnnouncementsManager } from "./announcements-manager";
import { FeaturedItemDialog } from "./featured-item-dialog";
import { FeaturedSectionDialog } from "./featured-section-dialog";

interface FeaturedSection {
  id: number;
  title: string;
  layout: string | null;
  order_ind: number | null;
  is_active: boolean | null;
  allowed_roles?: number[] | null;
  updated_at: string | null;
}

interface FeaturedItem {
  id: number;
  section_id: number | null;
  entity_type: string | null;
  entity_id: number;
  order_ind: number | null;
  allowed_roles?: number[] | null;
  updated_at: string | null;
}

interface HomepageClientProps {
  sections: FeaturedSection[];
  items: FeaturedItem[];
  categories: { id: number; name: string }[];
  recordings: { id: number; name: string }[];
  announcements?: Announcement[];
}

export const HomepageClient = ({
  sections: initialSections,
  items: initialItems,
  categories,
  recordings,
  announcements = [],
}: HomepageClientProps) => {
  const queryClient = useQueryClient();
  const { data: roles = [] } = useRoles();
  const [activeSectionId, setActiveSectionId] = useState<number | null>(
    initialSections[0]?.id || null,
  );

  // Dialog States
  const [editingSection, setEditingSection] = useState<FeaturedSection | null>(
    null,
  );
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Find active section and its items
  const activeSection = initialSections.find((s) => s.id === activeSectionId);
  const activeItems = initialItems
    .filter((item) => item.section_id === activeSectionId)
    .sort((a, b) => (a.order_ind || 0) - (b.order_ind || 0));

  const handleEditSection = (sec: FeaturedSection) => {
    setEditingSection(sec);
    setIsSectionDialogOpen(true);
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setIsSectionDialogOpen(true);
  };

  const handleDeleteSection = (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this featured section? All items inside it will also be removed.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteFeaturedSection(id);
      if (res.success) {
        const db = await getDB();
        if (db) {
          await db.delete(STORE.FEATURED_SECTIONS, id);
        }
        toast.success("Section deleted successfully");
        triggerSync([STORE.FEATURED_SECTIONS]);
        queryClient.invalidateQueries({ queryKey: [STORE.FEATURED_SECTIONS] });
        queryClient.invalidateQueries({
          queryKey: [STORE.FEATURED_SECTIONS, STORE.ANNOUNCEMENTS],
        });
        if (activeSectionId === id) {
          const remaining = initialSections.filter((s) => s.id !== id);
          setActiveSectionId(remaining.length > 0 ? remaining[0].id : null);
        }
      } else {
        toast.error(res.error || "Failed to delete section");
      }
    });
  };

  const handleToggleActive = (sec: FeaturedSection) => {
    startTransition(async () => {
      const res = await updateFeaturedSection(sec.id, {
        title: sec.title,
        layout: (sec.layout as "carousel" | "grid" | "list") || "grid",
        is_active: !sec.is_active,
      });
      if (res.success) {
        toast.success(
          sec.is_active
            ? "Section deactivated (hidden on home page)"
            : "Section activated successfully",
        );
        triggerSync([STORE.FEATURED_SECTIONS]);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  const handleAddItem = () => {
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = (id: number) => {
    if (
      !confirm("Are you sure you want to remove this item from the section?")
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteFeaturedItem(id);
      if (res.success) {
        const db = await getDB();
        if (db) {
          await db.delete(STORE.FEATURED_ITEMS, id);
        }
        toast.success("Item removed successfully");
        triggerSync([STORE.FEATURED_ITEMS]);
        queryClient.invalidateQueries({ queryKey: [STORE.FEATURED_ITEMS] });
        queryClient.invalidateQueries({ queryKey: [STORE.FEATURED_SECTIONS] });
        queryClient.invalidateQueries({
          queryKey: [STORE.FEATURED_SECTIONS, STORE.ANNOUNCEMENTS],
        });
      } else {
        toast.error(res.error || "Failed to remove item");
      }
    });
  };

  // Reordering
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const sortedSecs = [...initialSections].sort(
      (a, b) => (a.order_ind || 0) - (b.order_ind || 0),
    );
    const payload = swapAndReorder(sortedSecs, index, direction);
    if (!payload) return;

    startTransition(async () => {
      const res = await reorderFeaturedSections(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to reorder sections");
      } else {
        triggerSync([STORE.FEATURED_SECTIONS]);
      }
    });
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const payload = swapAndReorder(activeItems, index, direction);
    if (!payload) return;

    startTransition(async () => {
      const res = await reorderFeaturedItems(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to reorder items");
      } else {
        triggerSync([STORE.FEATURED_ITEMS]);
      }
    });
  };

  const sortedSecs = [...initialSections].sort(
    (a, b) => (a.order_ind || 0) - (b.order_ind || 0),
  );

  const getEntityName = (type: string | null, id: number) => {
    if (type === "category") {
      const catId = Number(id);
      return (
        categories.find((c) => c.id === catId)?.name || `Category (ID: ${id})`
      );
    }
    return recordings.find((r) => r.id === id)?.name || `Recording (ID: ${id})`;
  };

  return (
    <Tabs defaultValue="banners" className="space-y-6">
      <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
        <TabsTrigger value="banners" className="flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Top Banners
          {announcements.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {announcements.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sections" className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          Featured Content Rows
          {initialSections.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {initialSections.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Top Banner Announcements Tab */}
      <TabsContent value="banners" className="space-y-6">
        <AnnouncementsManager announcements={announcements} />
      </TabsContent>

      {/* Featured Content Sections Tab */}
      <TabsContent value="sections">
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Sections Sidebar */}
          <Card className="h-fit">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">
                Featured Sections
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleAddSection}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {sortedSecs.length === 0 ? (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  No sections configured
                </div>
              ) : (
                sortedSecs.map((sec, idx) => {
                  const isActive = sec.id === activeSectionId;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      className={`w-full text-left flex items-center justify-between group rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => setActiveSectionId(sec.id)}
                    >
                      <span className="truncate mr-2 flex items-center gap-2">
                        {!sec.is_active && (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                        )}
                        {sec.title}
                      </span>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(idx, "up");
                          }}
                          disabled={idx === 0 || isPending}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(idx, "down");
                          }}
                          disabled={idx === sortedSecs.length - 1 || isPending}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Items List Area */}
          <div className="space-y-6">
            {activeSection ? (
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                      {activeSection.title}
                      <Badge variant="secondary" className="text-xs uppercase">
                        {activeSection.layout || "grid"}
                      </Badge>
                      {!activeSection.is_active && (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground"
                        >
                          Hidden
                        </Badge>
                      )}
                      {activeSection.allowed_roles &&
                      activeSection.allowed_roles.length > 0 ? (
                        activeSection.allowed_roles.map((rId) => {
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
                    </CardTitle>
                    <CardDescription>
                      Configure and order featured content displayed inside this
                      row on the homepage.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(activeSection)}
                      disabled={isPending}
                    >
                      {activeSection.is_active ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Section
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Section
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSection(activeSection)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSection(activeSection.id)}
                      disabled={isPending}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button size="sm" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-4">
                  {activeItems.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      No featured items in this section yet.
                    </div>
                  ) : (
                    activeItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-4 border border-border rounded-lg bg-card shadow-xs flex flex-row justify-between items-center gap-4 transition-all hover:border-input"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {getEntityName(item.entity_type, item.entity_id)}
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground text-xs uppercase"
                            >
                              {item.entity_type}
                            </Badge>
                            {item.allowed_roles &&
                              item.allowed_roles.length > 0 &&
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
                              })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleMoveItem(idx, "up")}
                            disabled={idx === 0 || isPending}
                            title="Move Up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleMoveItem(idx, "down")}
                            disabled={
                              idx === activeItems.length - 1 || isPending
                            }
                            title="Move Down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Remove Item"
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
            ) : (
              <div className="text-center p-12 text-sm text-muted-foreground border border-border rounded-lg">
                Create or select a featured section to start managing items.
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Dialogs */}
      <FeaturedSectionDialog
        open={isSectionDialogOpen}
        onOpenChange={setIsSectionDialogOpen}
        section={editingSection}
        onSuccess={() => {}}
      />
      {activeSectionId && (
        <FeaturedItemDialog
          open={isItemDialogOpen}
          onOpenChange={setIsItemDialogOpen}
          sectionId={activeSectionId}
          categories={categories}
          recordings={recordings}
          onSuccess={() => {}}
        />
      )}
    </Tabs>
  );
};
