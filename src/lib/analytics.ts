import {
  answerDisplayValue,
  isChoiceFieldType,
  type FormField,
} from "@/lib/form-fields";
import { registrationHeadcount } from "@/lib/utils";
import type { EventRow, RegistrationRow } from "@/lib/types";

export type DayBucket = { date: string; count: number };

export type ChoiceBreakdown = {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  options: { key: string; label: string; count: number }[];
};

export type EventAnalytics = {
  formCount: number;
  headcount: number;
  byDay: DayBucket[];
  choiceBreakdowns: ChoiceBreakdown[];
};

export type AnnualEventStat = {
  id: string;
  title: string;
  startsAt: string;
  formCount: number;
  headcount: number;
};

export type AnnualAnalytics = {
  year: number;
  eventCount: number;
  formCount: number;
  headcount: number;
  events: AnnualEventStat[];
};

function dayKey(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

export function buildEventAnalytics(
  rows: RegistrationRow[],
  fields: FormField[],
  timeZone: string,
): EventAnalytics {
  const byDayMap = new Map<string, number>();
  let headcount = 0;

  for (const row of rows) {
    headcount += registrationHeadcount(row.answers, row);
    const key = dayKey(row.created_at, timeZone);
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
  }

  const byDay = [...byDayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const choiceBreakdowns: ChoiceBreakdown[] = [];
  for (const field of fields) {
    if (!isChoiceFieldType(field.type)) continue;
    const counts = new Map<string, number>();
    for (const row of rows) {
      const raw = row.answers?.[field.id];
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw == null || raw === ""
          ? []
          : [String(raw)];
      for (const v of values) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    const options = [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: answerDisplayValue(key, field),
        count,
      }))
      .sort((a, b) => b.count - a.count);
    choiceBreakdowns.push({
      fieldId: field.id,
      fieldLabel: field.label,
      fieldType: field.type,
      options,
    });
  }

  return {
    formCount: rows.length,
    headcount,
    byDay,
    choiceBreakdowns,
  };
}

export function buildAnnualAnalytics(
  events: Pick<EventRow, "id" | "title" | "starts_at">[],
  registrations: {
    event_id: string;
    answers: Record<string, unknown> | null;
    adults_count?: number;
    children_count?: number;
    created_at: string;
  }[],
  year: number,
): AnnualAnalytics {
  const inYear = events.filter((e) => {
    const y = new Date(e.starts_at).getUTCFullYear();
    return y === year;
  });
  const eventIds = new Set(inYear.map((e) => e.id));
  const regs = registrations.filter((r) => eventIds.has(r.event_id));

  const byEvent = new Map<string, { formCount: number; headcount: number }>();
  for (const id of eventIds) byEvent.set(id, { formCount: 0, headcount: 0 });

  let headcount = 0;
  for (const row of regs) {
    const hc = registrationHeadcount(row.answers, row);
    headcount += hc;
    const cur = byEvent.get(row.event_id) ?? { formCount: 0, headcount: 0 };
    cur.formCount += 1;
    cur.headcount += hc;
    byEvent.set(row.event_id, cur);
  }

  const eventStats: AnnualEventStat[] = inYear
    .map((e) => {
      const s = byEvent.get(e.id) ?? { formCount: 0, headcount: 0 };
      return {
        id: e.id,
        title: e.title,
        startsAt: e.starts_at,
        formCount: s.formCount,
        headcount: s.headcount,
      };
    })
    .sort((a, b) => b.formCount - a.formCount);

  return {
    year,
    eventCount: inYear.length,
    formCount: regs.length,
    headcount,
    events: eventStats,
  };
}

export function availableYears(events: { starts_at: string }[]): number[] {
  const years = new Set<number>();
  const current = new Date().getFullYear();
  years.add(current);
  for (const e of events) {
    years.add(new Date(e.starts_at).getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}
