import PortalShell from "@/components/layout/PortalShell";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
