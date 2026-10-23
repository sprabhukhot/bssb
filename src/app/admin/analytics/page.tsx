import Link from "next/link";
import { AnnualAnalyticsPanel } from "@/components/analytics-panel";
import {
  availableYears,
  buildAnnualAnalytics,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return null;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .order("starts_at", { ascending: false });

  const eventRows = events ?? [];
  const years = availableYears(eventRows);
  const selectedYear = Number(yearParam) || years[0] || new Date().getFullYear();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id, answers, adults_count, children_count, created_at");

  const annual = buildAnnualAnalytics(
    eventRows,
    registrations ?? [],
    selectedYear,
  );

  return (
    <>
      <Link className="muted" href="/admin">
        ← All events
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        Analytics
      </h1>
      <AnnualAnalyticsPanel
        data={annual}
        years={years}
        selectedYear={selectedYear}
      />
    </>
  );
}
