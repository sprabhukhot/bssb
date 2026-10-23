import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildExportMatrix, resolveExportFields } from "@/lib/export-attendees";
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
    .select("slug, title, form_fields")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields = resolveExportFields(event.form_fields);

  const { data: rows, error } = await supabase
    .from("registrations")
    .select("answers, full_name, email, phone, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { headers, matrix } = buildExportMatrix(fields, rows ?? []);
  const lines = [
    headers.map(csvEscape).join(","),
    ...matrix.map((row) => row.map(csvEscape).join(",")),
  ];

  const body = lines.join("\n");
  const filename = `${event.slug || "registrations"}-attendees.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
