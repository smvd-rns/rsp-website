"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, GripVertical, MoreVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { reorderServices } from "@/app/actions/service-actions";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import type { Service } from "@/types";

interface ServiceCatalogTabProps {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
}

const SortableServiceRow = ({ svc }: { svc: Service }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: svc.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "bg-muted" : ""}`}
    >
      <TableCell className="w-[50px]">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/80 hover:text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{svc.name}</TableCell>
      <TableCell className="text-muted-foreground">{svc.type || "-"}</TableCell>
      <TableCell>
        {svc.is_public ? (
          <Badge className="bg-success/10 text-success hover:bg-success/10">
            Public
          </Badge>
        ) : (
          <Badge variant="secondary">Private</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" type="button">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toast.info("Edit not implemented yet")}
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:text-danger focus:bg-danger/5"
              onClick={() => toast.info("Delete not implemented yet")}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export const ServiceCatalogTab = ({
  services,
  setServices,
}: ServiceCatalogTabProps) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setServices((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  };

  const handleSaveReorder = async () => {
    startTransition(async () => {
      try {
        const items = services.map((svc, index) => ({
          id: svc.id,
          order_ind: index,
        }));
        await reorderServices(items);
        setHasChanges(false);
        toast.success("Services order saved successfully.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save order.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Services Catalog</h2>
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              onClick={handleSaveReorder}
              disabled={isPending}
              variant="outline"
              type="button"
            >
              {isPending ? "Saving..." : "Save Order"}
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/services/new" prefetch={false}>
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
          <CardDescription>
            Drag rows using the handles to define their order in the public
            application.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={services.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {services.map((svc) => (
                      <SortableServiceRow key={svc.id} svc={svc} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No services found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
