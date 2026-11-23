import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewUserForm } from "@/components/admin/new-user-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Add User | RSP Admin",
  description: "Create and invite new users",
};

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users" prefetch={false}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create internal users and assign roles directly.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <NewUserForm />
      </div>

      <div className="bg-warning/5 border border-warning/10 rounded-lg p-4 text-sm text-warning">
        <p className="font-semibold mb-1">Important Note:</p>
        <p>
          Whitelisting a user grants them permission to log in and access the
          dashboard. If "Send welcome info via Resend" is checked, the user will
          receive a customized email notification containing instructions to
          sign up or log in using their Google account with the registered
          email.
        </p>
      </div>
    </div>
  );
}
