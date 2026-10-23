import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { buildExportMatrix, resolveExportFields } from "@/lib/export-attendees";

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BSSB Event Registration";
  const sheet = workbook.addWorksheet("Attendees");
  sheet.addRow(headers);
  for (const row of matrix) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = Math.min(len, 48);
    });
    col.width = max + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${event.slug || "registrations"}-attendees.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
