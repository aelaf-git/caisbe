import { utilityLinks } from "@/lib/data/navigation";
import AuthNav from "@/components/auth/AuthNav";
import Logo from "@/components/layout/Logo";
import MainNav from "@/components/layout/MainNav";
import NavTextLink from "@/components/ui/NavTextLink";

export default async function Header() {
  return (
    <header className="font-hopewell sticky top-0 z-50 overflow-visible bg-white shadow-hopewell-nav">
      {/* Desktop-only utility row — moves into the hamburger drawer below lg */}
      <div className="hidden border-b border-ifma-border-light bg-white lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4 text-base">
          <div className="flex min-w-0 items-center gap-x-4 overflow-x-auto">
            {utilityLinks.map((link) => (
              <NavTextLink
                key={link.href}
                href={link.href}
                className="shrink-0 leading-none text-caisbe-text"
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

      <div className="relative overflow-visible bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 overflow-visible px-4 sm:h-16 sm:gap-6">
          <Logo variant="header" />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
