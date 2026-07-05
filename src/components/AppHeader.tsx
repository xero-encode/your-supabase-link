import { Link } from "@tanstack/react-router";

const linkClass =
  "text-muted-foreground transition-colors hover:text-foreground";
const activeLinkProps = {
  className:
    "text-foreground font-medium border-b-2 border-accent-red pb-0.5",
};

export function AppHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="font-serif text-2xl tracking-tight text-foreground"
        >
          ReelTake
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            to="/dashboard"
            className={linkClass}
            activeProps={activeLinkProps}
          >
            Dashboard
          </Link>
          <Link
            to="/statements"
            className={linkClass}
            activeProps={activeLinkProps}
            activeOptions={{ exact: false }}
          >
            Statements
          </Link>
          <Link
            to="/deals"
            className={linkClass}
            activeProps={activeLinkProps}
          >
            Deals
          </Link>
          <Link
            to="/performance"
            className={linkClass}
            activeProps={activeLinkProps}
          >
            Performance
          </Link>
        </nav>
      </div>
    </header>
  );
}
