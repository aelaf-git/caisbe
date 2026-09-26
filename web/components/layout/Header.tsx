import { utilityLinks } from "@/lib/data/navigation";
import AuthNav from "@/components/auth/AuthNav";
import Logo from "@/components/layout/Logo";
import MainNav from "@/components/layout/MainNav";
import NavTextLink from "@/components/ui/NavTextLink";

export default async function Header() {
  return (
    <header className="sticky top-0 z-50 overflow-visible bg-white">
      <div className="border-b border-ifma-border-light bg-white">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-4 px-4 text-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            {utilityLinks.map((link) => (
              <NavTextLink
                key={link.href}
                href={link.href}
                className="leading-none text-caisbe-text"
              >
                {link.label}
              </NavTextLink>
            ))}
          </div>
          <div className="flex shrink-0 items-center">
            <AuthNav />
          </div>
        </div>
      </div>

      <div className="shadow-brand-nav relative overflow-visible border-b-2 border-caisbe-red bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 overflow-visible px-4 py-2.5">
          <Logo variant="header" />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
