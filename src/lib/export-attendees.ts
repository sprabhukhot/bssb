import {
  answerDisplayValue,
  parseFormFieldsJson,
  type FormField,
} from "@/lib/form-fields";

export type ExportRow = {
  answers: Record<string, unknown> | null;
  full_name: string;
  email: string | null;
  phone: string;
  created_at: string;
};

export function resolveExportFields(formFields: unknown): FormField[] {
  return parseFormFieldsJson(formFields);
}

export function exportCellValue(
  row: ExportRow,
  field: FormField,
): string {
  const answers = (row.answers ?? {}) as Record<string, unknown>;
  let value = answers[field.id];
  if (value == null && field.id === "full_name") value = row.full_name;
  if (value == null && field.id === "email") value = row.email;
  if (value == null && field.id === "phone") value = row.phone;
  return answerDisplayValue(value, field);
}

export function buildExportMatrix(
  fields: FormField[],
  rows: ExportRow[],
): { headers: string[]; matrix: string[][] } {
  const headers = [...fields.map((f) => f.label), "registered_at"];
  const matrix = rows.map((row) => [
    ...fields.map((f) => exportCellValue(row, f)),
    row.created_at,
  ]);
  return { headers, matrix };
}
