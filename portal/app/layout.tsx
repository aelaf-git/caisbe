import type { Metadata } from "next";
import AppearanceProvider from "@/components/appearance/AppearanceProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { appearanceBootScript } from "@/lib/appearance";
import { appearanceFontClassName } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "myCAISBE",
  description: "myCAISBE education portal for courses, exams, and certificates",
  icons: {
    icon: [{ url: "/images/favicon.png", type: "image/png" }],
    apple: [{ url: "/images/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${appearanceFontClassName} h-full`} suppressHydrationWarning>
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
