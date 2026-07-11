import Link from "next/link";
import ButtonLink from "@/components/ui/ButtonLink";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { siteName } from "@/lib/data/home";

type UnderConstructionProps = {
  title: string;
};

export default function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <section className="border-b border-ifma-border-light bg-white py-20 md:py-28">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
              Under Construction
            </p>
            <h1 className="brand-section-title mt-4 text-3xl font-semibold md:text-4xl">
              {title}
            </h1>
            <p className="mt-6 text-base leading-7 text-caisbe-muted">
              This page is currently being built. {siteName} is working on
              bringing you this content soon. Thank you for your patience.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <ButtonLink href="/" variant="primary">
                Back to Home
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Contact Us
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function NavTextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`transition-colors hover:text-caisbe-green ${className}`}
    >
      {children}
    </Link>
  );
}
