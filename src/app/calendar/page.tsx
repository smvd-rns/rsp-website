import type { Metadata } from "next";
import { getCalendarConfig } from "@/app/actions/calendar-actions";
import { CalendarClient } from "./calendar-client";

export const metadata: Metadata = {
  title: "Discourse Calendar & Schedule | HG Radheshyam Das",
  description:
    "Explore the official discourse itinerary, upcoming youth camp schedules, and lecture dates of His Grace Radheshyam Das.",
  alternates: {
    canonical: "https://radheshyamdas.com/calendar",
  },
  openGraph: {
    title: "Discourse Calendar & Schedule | HG Radheshyam Das",
    description:
      "Explore the official discourse itinerary, upcoming youth camp schedules, and lecture dates of His Grace Radheshyam Das.",
    url: "https://radheshyamdas.com/calendar",
    type: "website",
  },
};

export default async function CalendarPage() {
  const config = await getCalendarConfig();

  return <CalendarClient config={config} />;
}
