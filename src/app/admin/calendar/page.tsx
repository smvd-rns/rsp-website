import type { Metadata } from "next";
import { getCalendarConfig } from "@/app/actions/calendar-actions";
import { verifyAdmin } from "@/lib/auth-utils";
import { CalendarAdminClient } from "./calendar-admin-client";

export const metadata: Metadata = {
  title: "HG RSP Calendar Management | Admin Portal",
  description: "Configure and update the official HG Radheshyam Das calendar document link.",
};

export default async function AdminCalendarPage() {
  await verifyAdmin(true);
  const config = await getCalendarConfig();

  return <CalendarAdminClient initialConfig={config} />;
}
