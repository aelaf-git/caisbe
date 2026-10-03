import type { Metadata } from "next";
import {
  Inter,
  Merriweather,
  Nunito_Sans,
  Open_Sans,
  Poppins,
  Roboto,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
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

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CAISBE Student Portal",
  description: "CAISBE student course portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${openSans.variable} ${inter.variable} ${sourceSans.variable} ${merriweather.variable} ${sourceSerif.variable} ${poppins.variable} ${nunito.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="font-hopewell flex min-h-full flex-col bg-admin-canvas text-foreground antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript() }} />
        <AuthProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
