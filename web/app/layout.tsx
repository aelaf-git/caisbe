import type { Metadata } from "next";
import VisitTracker from "@/components/analytics/VisitTracker";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { siteFontClassName } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAISBE - Canada Africa Institute for the Sustainable Built Environment",
  description:
    "CAISBE prepares the next generation of facility and property management professionals to lead sustainable transformation across buildings and infrastructure in Africa.",
  icons: {
    icon: [{ url: "/images/favicon.png", type: "image/png" }],
    apple: [{ url: "/images/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${siteFontClassName} h-full`} suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <VisitTracker />
        <Header />
        <main className="font-hopewell flex-1 bg-[#f8fafc]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
