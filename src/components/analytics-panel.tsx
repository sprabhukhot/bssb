import type { AnnualAnalytics, EventAnalytics } from "@/lib/analytics";

export function EventAnalyticsPanel({ data }: { data: EventAnalytics }) {
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.count));

  return (
    <section className="panel analytics-panel">
      <h2 style={{ marginTop: 0 }}>Event analytics</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        From Supabase registrations — no third-party analytics.
      </p>

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
      {!data.byDay.length ? (
        <p className="empty">No registrations yet.</p>
      ) : (
        <ul className="analytics-bars">
          {data.byDay.map((bucket) => (
            <li key={bucket.date}>
              <span className="analytics-bars__label">{bucket.date}</span>
              <span className="analytics-bars__track">
                <span
                  className="analytics-bars__fill"
                  style={{ width: `${(bucket.count / maxDay) * 100}%` }}
                />
              </span>
              <span className="analytics-bars__count">{bucket.count}</span>
            </li>
          ))}
        </ul>
      )}

      {data.choiceBreakdowns.map((breakdown) => {
        const max = Math.max(1, ...breakdown.options.map((o) => o.count));
        return (
          <div key={breakdown.fieldId} className="analytics-breakdown">
            <h3>
              {breakdown.fieldLabel}{" "}
              <span className="muted">({breakdown.fieldType})</span>
            </h3>
            {!breakdown.options.length ? (
              <p className="muted">No answers yet.</p>
            ) : (
              <ul className="analytics-bars">
                {breakdown.options.map((opt) => (
                  <li key={opt.key}>
                    <span className="analytics-bars__label">{opt.label}</span>
                    <span className="analytics-bars__track">
                      <span
                        className="analytics-bars__fill"
                        style={{ width: `${(opt.count / max) * 100}%` }}
                      />
                    </span>
                    <span className="analytics-bars__count">{opt.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
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
  return (
    <section className="panel analytics-panel">
      <div className="analytics-panel__head">
        <div>
          <h2 style={{ marginTop: 0 }}>Annual overview</h2>
          <p className="muted" style={{ margin: 0 }}>
            Combined totals across events that start in the selected year.
          </p>
        </div>
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

      <h3>Top events</h3>
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
