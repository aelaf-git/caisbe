import type { Metadata } from "next";
import { Open_Sans, Roboto } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "CAISBE Student Portal",
  description: "CAISBE student course portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${openSans.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-white antialiased" suppressHydrationWarning>
        <AuthProvider>
          <header className="border-b border-ifma-border bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <a href="/" className="text-sm font-semibold uppercase tracking-wide text-caisbe-green">
                CAISBE Student Portal
              </a>
              <a
                href={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
                className="text-sm text-caisbe-muted hover:text-caisbe-green"
              >
                Website
              </a>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
