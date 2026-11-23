"use client";

import { Link as LinkIcon, Plus } from "lucide-react";
import { useState } from "react";
import { RedirectDeleteDialog } from "@/components/admin/redirect-delete-dialog";
import { RedirectDialog } from "@/components/admin/redirect-dialog";
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
import { useCategories } from "@/hooks/use-categories";
import { useRedirects } from "@/hooks/use-redirects";
import type { Redirect } from "@/types";

const RedirectsPage = () => {
  const { data: redirects = [], isLoading } = useRedirects();
  const { data: categories = [] } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Redirect | null>(null);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/20 shadow-2xs">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Link Redirects & Shortlinks
            </h1>
            <p className="text-xs text-muted-foreground">
              Forward legacy URLs, set up vanity campaign links, and route external paths safely.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditingRedirect(null);
              setDialogOpen(true);
            }}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9 cursor-pointer text-xs shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Redirect
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 rounded-2xl shadow-2xs overflow-hidden bg-card">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>All Redirect Rules</span>
              <Badge variant="secondary" className="text-xxs font-semibold px-2 py-0 rounded-md">
                {redirects.length} Active
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Rules that redirect users from an old path to a new destination.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Path (Category)</TableHead>
                <TableHead>To Path</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow colSpan={3} message="Loading redirects..." />
              ) : redirects.length > 0 ? (
                redirects.map((redirect) => {
                  const cat = categories.find(
                    (c) => c.url_path === redirect.id,
                  );
                  return (
                    <TableRow key={redirect.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          {cat && (
                            <span className="font-semibold text-xs text-foreground">
                              {cat.name}
                            </span>
                          )}
                          <span className="font-mono text-xs text-muted-foreground break-all">
                            {redirect.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs break-all">
                        {redirect.to_path}
                      </TableCell>
                      <TableCell>
                        <AdminRowActions
                          onEdit={() => {
                            setEditingRedirect(redirect);
                            setDialogOpen(true);
                          }}
                          onDelete={() => setDeleteCandidate(redirect)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableEmptyRow colSpan={3} message="No redirects found." />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RedirectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        redirect={editingRedirect}
      />

      <RedirectDeleteDialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
        redirect={deleteCandidate}
      />
    </div>
  );
};

export default RedirectsPage;
