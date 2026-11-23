"use client";

import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import {
  AdminRowActions,
  TableEmptyRow,
  TableLoadingRow,
} from "@/components/admin/table-shell-rows";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEvents } from "@/hooks/use-events";
import { toast } from "@/lib/toast";

const EventsPage = () => {
  const { data: events = [], isLoading } = useEvents();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Events & Yatras
            </h1>
            <p className="text-xs text-muted-foreground">
              Group spiritual discourses under major yatras, festivals, and multi-day seminars.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9 cursor-pointer text-xs shadow-xs"
          >
            <Link href="/admin/events/new" prefetch={false}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>Add Event</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 rounded-2xl shadow-2xs overflow-hidden bg-card">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>All Events</span>
              <Badge variant="secondary" className="text-xxs font-semibold px-2 py-0 rounded-md">
                {events.length} Events
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Events can be tagged on recordings to group them (e.g., "Kartik Yatra 2024").
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Short Name</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow colSpan={3} message="Loading events..." />
              ) : events.length > 0 ? (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.short_name || "-"}
                    </TableCell>
                    <TableCell>
                      <AdminRowActions
                        onEdit={() => toast.info("Edit not implemented yet")}
                        onDelete={() =>
                          toast.info("Delete not implemented yet")
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={3}
                  message="No events found. Create one to get started."
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsPage;
