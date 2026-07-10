import { quickLinks, utilityLinks } from "@/lib/data/navigation";
import Logo from "@/components/layout/Logo";
import MainNav from "@/components/layout/MainNav";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 overflow-visible bg-white">
      <div className="border-b border-ifma-border-light bg-ifma-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm text-ifma-muted">
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
          <div className="flex flex-wrap gap-4">
            {quickLinks.map((link) => (
              <span
                key={link}
                className={`cursor-default hover:text-ifma-blue-bright ${
                  link === "Register" ? "font-medium text-ifma-blue-bright" : ""
                }`}
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ifma-nav-shadow relative overflow-visible border-t-4 border-ifma-navy bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-visible px-4 py-2">
          <Logo variant="header" />
          <MainNav />
        </div>
      </div>
    </header>
  );
}
