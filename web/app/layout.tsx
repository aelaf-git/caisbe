import type { Metadata } from "next";
import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { registerServerLocaleResolver } from "@/lib/api";
import { siteName } from "@/lib/data/home";
import { siteFontClassName } from "@/lib/fonts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/server";
import { OG_LOCALE } from "@/lib/i18n/seo";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

registerServerLocaleResolver(getServerLocale);

const DESCRIPTION = {
  en: "CAISBE prepares the next generation of facility and property management professionals to lead sustainable transformation across buildings and infrastructure in Africa.",
  fr: "Le CAISBE prépare la prochaine génération de professionnels de la gestion des installations et des biens immobiliers à mener la transformation durable des bâtiments et des infrastructures en Afrique.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title =
    locale === "fr"
      ? "CAISBE - Institut Canada-Afrique pour l’environnement bâti durable"
      : "CAISBE - Canada Africa Institute for the Sustainable Built Environment";
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description: DESCRIPTION[locale],
    robots: { index: true, follow: true },
    openGraph: {
      siteName: siteName,
      type: "website",
      locale: OG_LOCALE[locale],
    },
    icons: {
      icon: [{ url: "/images/favicon.png", type: "image/png" }],
      apple: [{ url: "/images/favicon.png", type: "image/png" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={`${siteFontClassName} h-full`} suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <LocaleProvider locale={locale}>
          <VisitTracker />
          <Header />
          <main className="font-hopewell flex-1 bg-[#f8fafc]">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
