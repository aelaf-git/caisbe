import AdminShell from "@/components/layout/AdminShell";

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
