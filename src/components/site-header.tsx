import Link from "next/link";

export function SiteHeader({
  right,
  subtitle = "Event registration",
}: {
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="site-header-bar">
      <header className="shell site-header">
        <Link href="/" className="brand-mark">
          <span className="brand-mark__logo" aria-hidden="true" />
          <span className="brand-mark__text">
            <span className="brand-mark__name">
              Bhartiya Sanskritik Sangh, Brno
            </span>
            <span className="brand-mark__tag">{subtitle}</span>
          </span>
        </Link>
        <div className="site-header__right">{right}</div>
      </header>
    </div>
  );
}
