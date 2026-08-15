import { utilityLinks } from "@/lib/data/navigation";
import AuthNav from "@/components/auth/AuthNav";
import Logo from "@/components/layout/Logo";
import MainNav from "@/components/layout/MainNav";
import NavTextLink from "@/components/ui/NavTextLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 overflow-visible bg-white">
      <div className="border-b border-ifma-border-light bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm text-caisbe-muted">
          <div className="flex flex-wrap gap-4">
            {utilityLinks.map((link) => (
              <NavTextLink key={link.href} href={link.href}>
                {link.label}
              </NavTextLink>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <AuthNav />
          </div>
        </div>
      </div>

      <div className="shadow-brand-nav relative overflow-visible border-b-2 border-caisbe-red bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-visible px-4 py-2">
          <Logo variant="header" />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
