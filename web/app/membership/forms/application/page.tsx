import PrintableFormToolbar from "@/components/membership/PrintableFormToolbar";
import PrintableMembershipApplication from "@/components/membership/PrintableMembershipApplication";

export default function MembershipApplicationFormPage() {
  return (
    <main className="bg-[#f8fafc] px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <PrintableFormToolbar kind="application" />
        <PrintableMembershipApplication kind="application" />
      </div>
    </main>
  );
}
