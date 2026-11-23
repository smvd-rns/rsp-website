"use client";

import {
  Award,
  BookOpen,
  Building2,
  FileText,
  Flame,
  GraduationCap,
  HeartHandshake,
  Home,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface UserFormData {
  name?: string;
  phone?: string;
  ashram?: string;
  temple?: string;
  purpose?: string;
  authorityName?: string;
  authorityRelationship?: string;
  authorityEmail?: string;
  [key: string]: unknown;
}

interface UserFormFieldsProps<T extends UserFormData> {
  formData: T;
  onChange: (data: T) => void;
  showAuthoritySection?: boolean;
}

export const UserFormFields = <T extends UserFormData>({
  formData,
  onChange,
  showAuthoritySection = true,
}: UserFormFieldsProps<T>) => {
  const updateField = (field: keyof UserFormData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Personal & Contact Information */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <User className="size-3.5 text-primary" />
          <span>Personal & Contact Info</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <span>Name</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
              <Input
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Full Name"
                className="pl-8 h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <span>Phone</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
              <Input
                value={formData.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Phone Number"
                className="pl-8 h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ashram & Center Affiliation */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Building2 className="size-3.5 text-primary" />
          <span>Ashram & Community Affiliation</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-500" />
              <span>Ashram</span>
            </Label>
            <Input
              value={formData.ashram || ""}
              onChange={(e) => updateField("ashram", e.target.value)}
              placeholder="e.g. Brahmachari, Grihastha"
              className="h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <MapPin className="size-3 text-rose-500" />
              <span>Temple / Center</span>
            </Label>
            <Input
              value={formData.temple || ""}
              onChange={(e) => updateField("temple", e.target.value)}
              placeholder="e.g. ISKCON Bangalore"
              className="h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Purpose & Seva */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
          <FileText className="size-3.5 text-primary" />
          <span>Purpose & Service Involvements</span>
        </div>
        <Textarea
          value={formData.purpose || ""}
          onChange={(e) => updateField("purpose", e.target.value)}
          placeholder="Brief description of the user's role or purpose"
          rows={2}
          className="rounded-xl bg-card border-border/80 resize-y min-h-[56px] focus-visible:ring-primary/20 text-sm py-2"
        />
      </div>

      {/* Authority / Guardian Section */}
      {showAuthoritySection && (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-3.5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Authority / Guardian Info
                </h5>
                <p className="text-[11px] text-muted-foreground">
                  Mentor, counselor, or temple authority for accountability
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] bg-background/80 font-normal px-2 py-0"
            >
              Verification
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <UserCheck className="size-3 text-muted-foreground" />
                <span>Authority Name</span>
              </Label>
              <Input
                value={formData.authorityName || ""}
                onChange={(e) => updateField("authorityName", e.target.value)}
                placeholder="Guardian Name"
                className="h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <HeartHandshake className="size-3 text-muted-foreground" />
                <span>Relationship</span>
              </Label>
              <Input
                value={formData.authorityRelationship || ""}
                onChange={(e) =>
                  updateField("authorityRelationship", e.target.value)
                }
                placeholder="Mentor, Parent, etc."
                className="h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <Mail className="size-3 text-muted-foreground" />
                <span>Authority Email</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="email"
                  value={formData.authorityEmail || ""}
                  onChange={(e) =>
                    updateField("authorityEmail", e.target.value)
                  }
                  placeholder="guardian@example.com"
                  className="pl-8 h-9 rounded-xl bg-card border-border/80 focus-visible:ring-primary/20 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FALLBACK_ROLES = [
  { id: 1, name: "Administrator" },
  { id: 2, name: "Student" },
  { id: 3, name: "Leader" },
  { id: 4, name: "Brahmacari" },
  { id: 5, name: "BVP" },
  { id: 6, name: "Visitor" },
  { id: 7, name: "aspBrahmacari" },
  { id: 8, name: "Manager" },
];

export const getRoleVisuals = (roleName: string) => {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) {
    return {
      icon: Shield,
      badgeClass:
        "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      description: "Full administrative access and user management",
    };
  }
  if (lower.includes("leader")) {
    return {
      icon: Award,
      badgeClass:
        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
      iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      description: "Department, project & group leadership access",
    };
  }
  if (lower.includes("aspbrahm")) {
    return {
      icon: Flame,
      badgeClass:
        "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
      iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      description: "Aspiring Brahmacari candidate & training",
    };
  }
  if (lower.includes("brahm")) {
    return {
      icon: Flame,
      badgeClass:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      description: "Full-time resident brahmacari ashram access",
    };
  }
  if (lower.includes("student")) {
    return {
      icon: GraduationCap,
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      description: "Student courses, study materials & recordings",
    };
  }
  if (lower.includes("bvp")) {
    return {
      icon: Home,
      badgeClass:
        "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
      iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
      description: "Bhaktivedanta Vidyapitha member resources",
    };
  }
  if (lower.includes("manager")) {
    return {
      icon: UserCheck,
      badgeClass:
        "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
      description: "Service coordination and resource management",
    };
  }
  return {
    icon: BookOpen,
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconBg: "bg-muted text-muted-foreground",
    description: "General member or visitor access permissions",
  };
};

export const UserRoleSelectField = ({
  value,
  onChange,
  roles,
  label = "Assigned Role",
  disabled = false,
}: {
  value?: string;
  onChange: (val: string) => void;
  roles?: { id: number; name: string }[];
  label?: string;
  disabled?: boolean;
}) => {
  const activeRoles = roles && roles.length > 0 ? roles : FALLBACK_ROLES;
  const selectedRole = activeRoles.find((r) => r.id.toString() === value);
  const selectedVisuals = selectedRole
    ? getRoleVisuals(selectedRole.name)
    : null;
  const SelectedIcon = selectedVisuals?.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <Shield className="size-4 text-primary" />
          <span>{label}</span>
        </Label>
        {selectedRole && (
          <span className="text-[11px] text-muted-foreground font-medium">
            Active:{" "}
            <span className="text-foreground font-semibold">
              {selectedRole.name}
            </span>
          </span>
        )}
      </div>

      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-12 rounded-xl bg-card border-border/80 px-3.5 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedRole && SelectedIcon && selectedVisuals ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg shrink-0",
                    selectedVisuals.iconBg,
                  )}
                >
                  <SelectedIcon className="size-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="font-semibold text-sm leading-tight text-foreground truncate">
                    {selectedRole.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight truncate">
                    {selectedVisuals.description}
                  </span>
                </div>
              </div>
            ) : (
              <SelectValue placeholder="Select a role..." />
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-80 p-1.5 shadow-2xl border-border/80 bg-popover rounded-xl">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Available Roles & Access Levels
          </div>
          {activeRoles.map((role) => {
            const visuals = getRoleVisuals(role.name);
            const Icon = visuals.icon;
            const isSelected = value === role.id.toString();

            return (
              <SelectItem
                key={role.id}
                value={role.id.toString()}
                className={cn(
                  "py-2.5 px-3 rounded-lg cursor-pointer transition-all mb-0.5",
                  isSelected && "bg-primary/10 font-medium",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-6">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg shrink-0 transition-transform",
                      visuals.iconBg,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-medium text-sm text-foreground">
                      {role.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                      {visuals.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
