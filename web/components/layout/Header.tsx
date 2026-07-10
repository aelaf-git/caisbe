import { mainNav, utilityLinks } from "@/lib/data/home";

function NavItem({ label }: { label: string }) {
  return (
    <span className="cursor-default border-b-2 border-transparent px-3 py-5 text-[15px] font-medium text-ifma-text-dark transition-colors hover:border-ifma-blue hover:text-ifma-blue">
      {label}
    </span>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="border-b border-ifma-border-light bg-ifma-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-sm text-ifma-muted">
          <div className="flex flex-wrap gap-4">
            {utilityLinks.map((link) => (
              <span
                key={link}
                className="cursor-default hover:text-ifma-blue-bright"
              >
                {link}
              </span>
            ))}
          </div>
          <div className="flex gap-4">
            <span className="cursor-default hover:text-ifma-blue-bright">
              Log in
            </span>
            <span className="cursor-default font-medium text-ifma-blue-bright">
              Register
            </span>
          </div>
        </div>
      </div>

      <div className="ifma-nav-shadow border-t-4 border-ifma-navy bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-ifma-navy text-lg font-bold text-white">
              IF
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ifma-blue">
                IFMA
              </p>
              <p className="max-w-[180px] text-[11px] text-ifma-muted">
                International Facility Management Association
              </p>
            </div>
          </div>

          <nav className="hidden items-center lg:flex">
            {mainNav.map((item) => (
              <NavItem key={item} label={item} />
            ))}
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
            <span className="rounded border border-ifma-navy px-3 py-2 text-sm text-ifma-navy">
              Menu
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
