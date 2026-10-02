import type { Metadata } from "next";
import { Inter, Merriweather, Open_Sans, Roboto, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import AppearanceProvider from "@/components/appearance/AppearanceProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { appearanceBootScript } from "@/lib/appearance";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "CAISBE Admin",
  description: "CAISBE course administration portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${openSans.variable} ${inter.variable} ${sourceSans.variable} ${merriweather.variable} ${sourceSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-admin-canvas font-sans text-foreground antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript() }} />
        <AuthProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
