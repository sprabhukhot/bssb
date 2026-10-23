import {
  BreakdownBars,
  TrendLineChart,
  VerticalBarChart,
} from "@/components/simple-charts";
import type { AnnualAnalytics, EventAnalytics } from "@/lib/analytics";

export function EventAnalyticsPanel({ data }: { data: EventAnalytics }) {
  return (
    <section className="panel analytics-panel">
      <h2 style={{ marginTop: 0 }}>Analytics</h2>

      <div className="analytics-summary">
        <div>
          <p className="live-counter__label">Forms</p>
          <p className="live-counter__value">{data.formCount}</p>
        </div>
        <div>
          <p className="live-counter__label">Headcount</p>
          <p className="live-counter__value">{data.headcount}</p>
        </div>
      </div>

      <h3>Registrations over time</h3>
      <TrendLineChart
        points={data.byDay.map((d) => ({ label: d.date, value: d.count }))}
      />

      {data.choiceBreakdowns.map((breakdown) => (
        <div key={breakdown.fieldId} className="analytics-breakdown">
          <h3>{breakdown.fieldLabel}</h3>
          <BreakdownBars
            points={breakdown.options.map((o) => ({
              label: o.label,
              value: o.count,
            }))}
          />
        </div>
      ))}
    </section>
  );
}

export function AnnualAnalyticsPanel({
  data,
  years,
  selectedYear,
  basePath = "/admin/analytics",
}: {
  data: AnnualAnalytics;
  years: number[];
  selectedYear: number;
  basePath?: string;
}) {
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <section className="panel analytics-panel">
      <div className="analytics-panel__head">
        <form method="get" action={basePath} className="analytics-year-form">
          <label className="field">
            <span>Year</span>
            <select name="year" defaultValue={String(selectedYear)}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary" type="submit">
            Show
          </button>
        </form>
      </div>

      <div className="analytics-summary">
        <div>
          <p className="live-counter__label">Events</p>
          <p className="live-counter__value">{data.eventCount}</p>
        </div>
        <div>
          <p className="live-counter__label">Registrations</p>
          <p className="live-counter__value">{data.formCount}</p>
        </div>
        <div>
          <p className="live-counter__label">Headcount</p>
          <p className="live-counter__value">{data.headcount}</p>
        </div>
      </div>

      <h3>Registrations by month</h3>
      <TrendLineChart
        points={data.byMonth.map((m) => ({
          label: monthLabels[Number(m.month.slice(5, 7)) - 1] ?? m.month,
          value: m.count,
        }))}
      />

      <h3>Events by registrations</h3>
      <VerticalBarChart
        points={data.events.slice(0, 12).map((e) => ({
          label: e.title,
          value: e.formCount,
        }))}
      />

      <h3>Events</h3>
      {!data.events.length ? (
        <p className="empty">No events in {data.year}.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Event</th>
                <th>Starts</th>
                <th>Forms</th>
                <th>Headcount</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <a href={`/admin/events/${e.id}`}>{e.title}</a>
                  </td>
                  <td>
                    {new Date(e.startsAt).toLocaleDateString("en-GB", {
                      timeZone: "Europe/Prague",
                    })}
                  </td>
                  <td>{e.formCount}</td>
                  <td>{e.headcount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
