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
  title: "CAISBE Admin",
  description: "CAISBE course administration portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${openSans.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[#f7f7f5] antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
