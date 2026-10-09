import Link from "next/link";

export function OrganizerShell({
  children,
  right,
  subtitle = "Community events",
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="portal">
      <div className="portal-top">
        <header className="shell portal-header">
          <Link href="/" className="portal-brand">
            <span className="portal-brand__mark" aria-hidden="true" />
            <span className="portal-brand__text">
              <span className="portal-brand__name">
                Bhartiya Sanskritik Sangh
              </span>
              <span className="portal-brand__tag">{subtitle}</span>
            </span>
          </Link>
          <div className="portal-header__right">{right}</div>
        </header>
      </div>
      <div className="portal-body">{children}</div>
    </div>
  );
}
