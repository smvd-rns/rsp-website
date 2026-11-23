"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateUser } from "@/app/actions/user-actions";
import { UserFormFields } from "@/components/admin/users/user-form-fields";
import { buildAdminUserPayload } from "@/components/admin/users/user-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useRoles } from "@/hooks/use-roles";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL_SUBJECT = "Welcome to RSP Admin";
const ADMIN_EMAIL_BODY = `Welcome!

You have been whitelisted as an Admin for the RSP Admin dashboard.
Please sign up or log in using your Google account with the email: {email}

Click the link below to access the dashboard:
{login_url}

Best regards,
The RSP Admin Team`;

const USER_EMAIL_SUBJECT = "Welcome to Radheshyam Das Portal";
const USER_EMAIL_BODY = `Welcome!

You have been whitelisted as a {role} for the Radheshyam Das Portal.
Please sign up or log in using your Google account with the email: {email}

Click the link below to access the portal:
{login_url}

Best regards,
The RSP Team`;

export const NewUserForm = () => {
  const router = useRouter();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    roleId: "",
    sendEmail: true,
    emailSubject: USER_EMAIL_SUBJECT,
    emailBody: USER_EMAIL_BODY,
    name: "",
    phone: "",
    ashram: "",
    temple: "",
    purpose: "",
    authorityName: "",
    authorityRelationship: "",
    authorityEmail: "",
  });

  const selectedRole = roles?.find((r) => r.id.toString() === formData.roleId);
  const roleName = selectedRole?.name || "User";

  const isAdminRole = formData.roleId === "1";
  const portalHeader = isAdminRole ? "RSP Admin" : "Radheshyam Das Portal";
  const portalButtonText = isAdminRole ? "Login to Dashboard" : "Access Portal";
  const portalFooter = isAdminRole ? "RSP Admin" : "Radheshyam Das Portal";

  const getPreviewSubject = () => {
    const loginUrl = isAdminRole
      ? "https://admin.radheshyamdas.com/auth/login"
      : "https://radheshyamdas.com/";
    return formData.emailSubject
      .replaceAll("{role}", roleName)
      .replaceAll("{email}", formData.email || "recipient@example.com")
      .replaceAll("{login_url}", loginUrl);
  };

  const getPreviewBodyHtml = () => {
    const loginUrl = isAdminRole
      ? "https://admin.radheshyamdas.com/auth/login"
      : "https://radheshyamdas.com/";
    const replaced = formData.emailBody
      .replaceAll("{role}", roleName)
      .replaceAll("{email}", formData.email || "recipient@example.com")
      .replaceAll("{login_url}", loginUrl);

    return replaced
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");
  };

  const handleRoleChange = (roleId: string) => {
    setFormData((prev) => {
      // Check if current subject and body match either admin or user defaults
      const isCurrentDefault =
        (prev.emailSubject === ADMIN_EMAIL_SUBJECT &&
          prev.emailBody === ADMIN_EMAIL_BODY) ||
        (prev.emailSubject === USER_EMAIL_SUBJECT &&
          prev.emailBody === USER_EMAIL_BODY);

      if (isCurrentDefault) {
        const isNewAdmin = roleId === "1";
        return {
          ...prev,
          roleId,
          emailSubject: isNewAdmin ? ADMIN_EMAIL_SUBJECT : USER_EMAIL_SUBJECT,
          emailBody: isNewAdmin ? ADMIN_EMAIL_BODY : USER_EMAIL_BODY,
        };
      }

      return { ...prev, roleId };
    });
  };

  const handleResetTemplate = () => {
    setFormData((prev) => ({
      ...prev,
      emailSubject: isAdminRole ? ADMIN_EMAIL_SUBJECT : USER_EMAIL_SUBJECT,
      emailBody: isAdminRole ? ADMIN_EMAIL_BODY : USER_EMAIL_BODY,
    }));
    toast.info("Template reset to default for selected role");
  };

  const handleConfirmUpdate = async () => {
    setIsSubmitting(true);
    try {
      const finalResult = await adminCreateUser(
        buildAdminUserPayload(formData.email, formData, true),
      );

      if (finalResult.success) {
        if (formData.sendEmail && !finalResult.emailSent) {
          toast.warning(
            `User updated, but failed to send email: ${finalResult.emailError}`,
          );
        } else if (formData.sendEmail && finalResult.emailSent) {
          toast.success("User details updated and email sent successfully!");
        } else {
          toast.success("User details updated successfully!");
        }
        setIsConfirmOpen(false);
        router.push("/users");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.roleId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminCreateUser(
        buildAdminUserPayload(formData.email, formData),
      );

      if (result.exists) {
        setIsSubmitting(false);
        setConfirmMessage(result.message);
        setIsConfirmOpen(true);
        return;
      }

      if (result.success) {
        if (formData.sendEmail && !result.emailSent) {
          toast.warning(
            `User whitelisted, but failed to send email: ${result.emailError}`,
          );
        } else if (formData.sendEmail && result.emailSent) {
          toast.success("User whitelisted and email sent successfully!");
        } else {
          toast.success("User whitelisted successfully!");
        }
        router.push("/users");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to whitelist user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn("w-full mx-auto transition-all duration-300 ease-in-out")}
    >
      <Card className="w-full border-border/80 shadow-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-6 mb-6">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Mail className="h-5 w-5 text-warning" />
              Add New User
            </CardTitle>
            <CardDescription>
              Whitelist a new user with a specific role and send them signup
              details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-8 transition-all duration-300",
                formData.sendEmail
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              {/* Left Column: Form Fields */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-semibold text-foreground"
                  >
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/80" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      className="pl-10 h-10"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="role"
                    className="font-semibold text-foreground"
                  >
                    Assigned Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.roleId}
                    onValueChange={handleRoleChange}
                    disabled={rolesLoading}
                  >
                    <SelectTrigger id="role" className="w-full h-10">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional profile fields button */}
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-between border-dashed border-input text-muted-foreground hover:text-foreground h-10 px-4 rounded-lg"
                    onClick={() => setShowOptionalFields(!showOptionalFields)}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-xs">
                      <UserPlus className="h-4 w-4 text-muted-foreground/80" />
                      {showOptionalFields
                        ? "Hide Additional Profile Fields"
                        : "Add Profile Fields (Optional)"}
                    </span>
                    {showOptionalFields ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Optional profile fields panel */}
                {showOptionalFields && (
                  <div className="p-4 border border-border rounded-xl space-y-4 bg-muted/50/50 text-primary-foreground/10 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="pt-2 pb-2">
                      <UserFormFields
                        formData={formData}
                        onChange={setFormData}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2 pb-1">
                  <Checkbox
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, sendEmail: checked === true })
                    }
                  />
                  <Label
                    htmlFor="sendEmail"
                    className="text-sm font-medium leading-none cursor-pointer select-none text-foreground"
                  >
                    Send welcome info via Resend
                  </Label>
                </div>

                {formData.sendEmail && (
                  <div className="pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-warning" />
                        Customize Email
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetTemplate}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Reset
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="emailSubject"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Email Subject
                      </Label>
                      <Input
                        id="emailSubject"
                        value={formData.emailSubject}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emailSubject: e.target.value,
                          })
                        }
                        className="h-9"
                        placeholder="Subject"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="emailBody"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Email Message
                      </Label>
                      <Textarea
                        id="emailBody"
                        value={formData.emailBody}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emailBody: e.target.value,
                          })
                        }
                        rows={8}
                        className="min-h-36 font-sans text-sm"
                        placeholder="Message body"
                      />
                    </div>

                    <div className="rounded-lg bg-muted/50/30 border border-border/50 p-3 text-xs text-muted-foreground">
                      <div className="flex gap-1.5 items-start mb-1 font-semibold text-foreground">
                        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>Dynamic Placeholders:</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[11px]">
                        <div className="bg-muted/80 px-1.5 py-0.5 rounded text-center text-foreground border border-border/50">
                          {"{role}"}
                        </div>
                        <div className="bg-muted/80 px-1.5 py-0.5 rounded text-center text-foreground border border-border/50">
                          {"{email}"}
                        </div>
                        <div className="bg-muted/80 px-1.5 py-0.5 rounded text-center text-foreground border border-border/50">
                          {"{login_url}"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Email Preview */}
              {formData.sendEmail && (
                <div className="flex flex-col h-full border border-border/60 rounded-xl bg-muted/50/50 p-4 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Live Email Preview
                    </span>
                  </div>

                  {/* Mail Client Shell */}
                  <div className="flex flex-col flex-1 border border-border rounded-lg shadow-sm overflow-hidden bg-card text-foreground text-sm">
                    {/* Header */}
                    <div className="bg-muted/50/80 border-b border-border p-3 space-y-1.5 text-xs text-muted-foreground select-none">
                      <div>
                        <span className="font-semibold text-muted-foreground/80">
                          From:
                        </span>{" "}
                        RSP Admin &lt;admin@rsp.app&gt;
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground/80">
                          To:
                        </span>{" "}
                        {formData.email || "recipient@example.com"}
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground/80">
                          Subject:
                        </span>{" "}
                        <span className="text-foreground font-medium">
                          {getPreviewSubject()}
                        </span>
                      </div>
                    </div>

                    {/* Styled HTML Body */}
                    <div className="flex-1 p-6 overflow-y-auto bg-muted/30">
                      <div className="max-w-[480px] mx-auto p-6 border border-border rounded-xl bg-card shadow-sm">
                        <h2 className="color-[#0f172a] mt-0 text-lg font-bold border-b border-border/50 pb-3 font-sans">
                          {portalHeader}
                        </h2>
                        <div
                          className="mt-4 text-[14px] leading-relaxed text-muted-foreground font-sans break-words"
                          // biome-ignore lint/security/noDangerouslySetInnerHtml: --ok
                          dangerouslySetInnerHTML={{
                            __html: getPreviewBodyHtml(),
                          }}
                        />
                        <div className="mt-6 mb-6 text-center">
                          <span className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold text-xs inline-block font-sans select-none shadow-sm cursor-default">
                            {portalButtonText}
                          </span>
                        </div>
                        <hr className="border-border/50 my-5" />
                        <p className="text-[11px] text-muted-foreground/80 text-center margin-0 font-sans">
                          This is an automated message from the {portalFooter}{" "}
                          team. Please do not reply.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 mt-6 flex justify-end">
            <Button
              type="submit"
              size="lg"
              className={cn(
                "px-8 font-semibold shadow-sm",
                formData.sendEmail ? "w-full md:w-auto" : "w-full",
              )}
              disabled={isSubmitting || rolesLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Whitelisting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Whitelist User
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
