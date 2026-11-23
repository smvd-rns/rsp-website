"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Settings, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
// Actions
import {
  deleteResponsibility,
  deleteServiceAssignment,
  deleteServiceInterest,
} from "@/app/actions/service-actions";
import { AssignmentDialog } from "@/components/admin/services/assignment-dialog";
import { AssignmentsTab } from "@/components/admin/services/assignments-tab";
import { InterestsTab } from "@/components/admin/services/interests-tab";
import { ResponsibilitiesTab } from "@/components/admin/services/responsibilities-tab";
import { ResponsibilityDialog } from "@/components/admin/services/responsibility-dialog";
// Components
import { ServiceCatalogTab } from "@/components/admin/services/service-catalog-tab";
import Loading from "@/components/loading";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STORE } from "@/constants";
// Hooks
import {
  type AssignmentWithDetails,
  type InterestWithDetails,
  type ResponsibilityWithDetails,
  useServiceAssignments,
  useServiceInterests,
  useServicesList,
  useUserResponsibilities,
  useUsersList,
} from "@/hooks/use-services";
import { toast } from "@/lib/toast";
import type { Service } from "@/types";

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("catalog");

  // Fetching data via React Query hooks
  const { data: rawServices = [], isLoading: isServicesLoading } =
    useServicesList();
  const { data: assignments = [], isLoading: isAssignmentsLoading } =
    useServiceAssignments();
  const { data: interests = [], isLoading: isInterestsLoading } =
    useServiceInterests();
  const { data: responsibilities = [], isLoading: isResponsibilitiesLoading } =
    useUserResponsibilities();
  const { data: users = [], isLoading: isUsersLoading } = useUsersList();

  // Local state for reorderable services list
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (rawServices.length > 0) {
      setServices(rawServices);
    }
  }, [rawServices]);

  // Dialog States
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentWithDetails | null>(null);

  const [isRespDialogOpen, setIsRespDialogOpen] = useState(false);
  const [selectedResponsibility, setSelectedResponsibility] =
    useState<ResponsibilityWithDetails | null>(null);

  // Prefill States for Converting Interest
  const [prefilledUserId, setPrefilledUserId] = useState("");
  const [prefilledServiceId, setPrefilledServiceId] = useState("");
  const [prefilledNotes, setPrefilledNotes] = useState("");

  // Delete Alert Dialog States
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "assignment" | "interest" | "responsibility";
    id?: string;
    userId?: string;
    serviceId?: number;
    label: string;
  } | null>(null);

  const isLoading =
    isServicesLoading ||
    isAssignmentsLoading ||
    isInterestsLoading ||
    isResponsibilitiesLoading ||
    isUsersLoading;

  if (isLoading) {
    return <Loading />;
  }

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleEditAssignment = (assign: AssignmentWithDetails) => {
    setSelectedAssignment(assign);
    setIsAssignDialogOpen(true);
  };

  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setPrefilledUserId("");
    setPrefilledServiceId("");
    setPrefilledNotes("");
    setIsAssignDialogOpen(true);
  };

  const handleConvertInterest = (interest: InterestWithDetails) => {
    setPrefilledUserId(interest.user_id);
    setPrefilledServiceId(interest.service_id.toString());
    setPrefilledNotes(
      interest.notes
        ? `Converted from interest expression: "${interest.notes}"`
        : "",
    );
    setIsAssignDialogOpen(true);
  };

  const handleEditResponsibility = (resp: ResponsibilityWithDetails) => {
    setSelectedResponsibility(resp);
    setIsRespDialogOpen(true);
  };

  const handleAddResponsibility = () => {
    setSelectedResponsibility(null);
    setIsRespDialogOpen(true);
  };

  const executeDeleteTarget = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "assignment" && deleteTarget.id) {
        await deleteServiceAssignment(deleteTarget.id);
        toast.success("Assignment removed successfully.");
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_SERVICE_ASSIGNMENTS],
        });
      } else if (deleteTarget.type === "responsibility" && deleteTarget.id) {
        await deleteResponsibility(deleteTarget.id);
        toast.success("Responsibility removed successfully.");
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_RESPONSIBILITIES],
        });
      } else if (
        deleteTarget.type === "interest" &&
        deleteTarget.userId &&
        deleteTarget.serviceId
      ) {
        await deleteServiceInterest(
          deleteTarget.userId,
          deleteTarget.serviceId,
        );
        toast.success("Interest expression deleted.");
        queryClient.invalidateQueries({
          queryKey: [STORE.USER_SERVICE_INTERESTS],
        });
      }
      // biome-ignore lint/suspicious/noExplicitAny: catch block
    } catch (err: any) {
      toast.error(err?.message || "Operation failed.");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-2xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Service Center (Seva Management)
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure seva catalog, review devotee interests, and manage department responsibilities.
            </p>
          </div>
        </div>

        {process.env.NEXT_PUBLIC_LEGACY_SERVICE_RECORDS && (
          <a
            href={process.env.NEXT_PUBLIC_LEGACY_SERVICE_RECORDS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Legacy Service Records</span>
          </a>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap p-1.5 bg-muted/40 border border-border/80 rounded-2xl w-fit gap-1 shadow-2xs">
          <TabsTrigger
            value="catalog"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Settings className="h-3.5 w-3.5 text-purple-600" />
            <span>Service Catalog</span>
          </TabsTrigger>

          <TabsTrigger
            value="assignments"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-600" />
            <span>Assignments</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600">
              {assignments.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="interests"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <User className="h-3.5 w-3.5 text-emerald-600" />
            <span>Volunteer Interests</span>
            {interests.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600">
                {interests.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="responsibilities"
            className="rounded-xl text-xs font-semibold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>Responsibilities</span>
            {responsibilities.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600">
                {responsibilities.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ServiceCatalogTab services={services} setServices={setServices} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab
            assignments={assignments}
            onEdit={handleEditAssignment}
            onAddClick={handleAddAssignment}
            onDeleteClick={(assign) =>
              setDeleteTarget({
                type: "assignment",
                id: assign.id,
                label: `Assignment of ${assign.users?.name || assign.users?.email} to ${assign.services?.name}`,
              })
            }
          />
        </TabsContent>

        <TabsContent value="interests">
          <InterestsTab
            interests={interests}
            onConvert={handleConvertInterest}
            onDeleteClick={(interest) =>
              setDeleteTarget({
                type: "interest",
                userId: interest.user_id,
                serviceId: interest.service_id,
                label: `Interest expression of ${interest.users?.name || interest.users?.email} in ${interest.services?.name}`,
              })
            }
          />
        </TabsContent>

        <TabsContent value="responsibilities">
          <ResponsibilitiesTab
            responsibilities={responsibilities}
            onEdit={handleEditResponsibility}
            onAddClick={handleAddResponsibility}
            onDeleteClick={(resp) =>
              setDeleteTarget({
                type: "responsibility",
                id: resp.id,
                label: `Responsibility "${resp.title}" for ${resp.users?.name || resp.users?.email}`,
              })
            }
          />
        </TabsContent>
      </Tabs>

      {/* Dialog: Service Assignment */}
      <AssignmentDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        assignment={selectedAssignment}
        users={users}
        services={services}
        prefilledUserId={prefilledUserId}
        prefilledServiceId={prefilledServiceId}
        prefilledNotes={prefilledNotes}
        onSuccess={() => {}}
      />

      {/* Dialog: Responsibility */}
      <ResponsibilityDialog
        open={isRespDialogOpen}
        onOpenChange={setIsRespDialogOpen}
        responsibility={selectedResponsibility}
        users={users}
        onSuccess={() => {}}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this record? <br />
              <strong className="text-foreground mt-2 block">
                {deleteTarget?.label}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteTarget}
              className="bg-danger hover:bg-danger text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
