import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  answerDisplayValue,
  parseFormFieldsJson,
} from "@/lib/form-fields";
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

  const fields = parseFormFieldsJson(event.form_fields);

  const { data: rows, error } = await supabase
    .from("registrations")
    .select("answers, full_name, email, phone, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [...fields.map((f) => f.label), "registered_at"];
  const lines = [
    header.map(csvEscape).join(","),
    ...(rows ?? []).map((row) => {
      const answers = (row.answers ?? {}) as Record<string, unknown>;
      const cells = fields.map((f) => {
        let value = answers[f.id];
        if (value == null && f.id === "full_name") value = row.full_name;
        if (value == null && f.id === "email") value = row.email;
        if (value == null && f.id === "phone") value = row.phone;
        return csvEscape(answerDisplayValue(value, f));
      });
      cells.push(csvEscape(row.created_at));
      return cells.join(",");
    }),
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
