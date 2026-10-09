import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { csvEscape } from "@/lib/utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { supabase, isAdmin } = await requireAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("registrations")
    .select(
      "full_name, email, phone, adults_count, children_count, dandiya_sets, samosas, kachoris, teas, jalebis, payment_acknowledged, data_consent, comments, created_at",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "full_name",
    "email",
    "phone",
    "adults_count",
    "children_count",
    "party_size",
    "dandiya_sets",
    "samosas",
    "kachoris",
    "teas",
    "jalebis",
    "payment_acknowledged",
    "data_consent",
    "comments",
    "registered_at",
  ];
  const lines = [
    header.join(","),
    ...(rows ?? []).map((row) =>
      [
        csvEscape(row.full_name),
        csvEscape(row.email),
        csvEscape(row.phone ?? ""),
        csvEscape(String(row.adults_count ?? "")),
        csvEscape(String(row.children_count ?? "")),
        csvEscape(
          String((row.adults_count ?? 0) + (row.children_count ?? 0)),
        ),
        csvEscape(String(row.dandiya_sets ?? "")),
        csvEscape(String(row.samosas ?? "")),
        csvEscape(String(row.kachoris ?? "")),
        csvEscape(String(row.teas ?? "")),
        csvEscape(String(row.jalebis ?? "")),
        csvEscape(row.payment_acknowledged ? "yes" : "no"),
        csvEscape(row.data_consent ? "yes" : "no"),
        csvEscape(row.comments ?? ""),
        csvEscape(row.created_at),
      ].join(","),
    ),
  ];

  const body = lines.join("\n");
  const filename = `${event.slug || "attendees"}-registrations.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
