import {
  additionalMembershipOptions,
  baseMembershipOptions,
  chapterMembershipOptions,
  membershipApplicationCopy,
} from "@/lib/data/membershipApplication";

function WriteLine({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-3">
      <p className="shrink-0 text-sm text-caisbe-text-dark">{label}</p>
      <div className="mb-1 h-8 flex-1 border-b border-caisbe-text-dark/40" />
    </div>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-caisbe-text-dark">
      <span className="inline-block h-3.5 w-3.5 shrink-0 border border-caisbe-text-dark" />
      {label}
    </span>
  );
}

function SectionBar({ title }: { title: string }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-caisbe-red bg-white" />
      <h2 className="font-hopewell-display text-sm font-bold uppercase tracking-wide text-caisbe-red">
        {title}
      </h2>
      <span className="h-0.5 flex-1 bg-caisbe-red" />
    </div>
  );
}

export default function PrintableMembershipApplication({
  kind,
}: {
  kind: "application" | "renewal";
}) {
  const title = kind === "renewal" ? "Membership Renewal" : "Membership Application";

  return (
    <article className="bg-white p-8 print:p-0">
      <h1 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-caisbe-text">{membershipApplicationCopy.dues}</p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-caisbe-text">
        {membershipApplicationCopy.returnTo}{" "}
        <span className="text-caisbe-red">Email: {membershipApplicationCopy.email}</span>
      </p>

      <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {kind === "renewal" ? (
          <div className="sm:col-span-2">
            <WriteLine label="Membership number:" />
          </div>
        ) : null}
        <WriteLine label="First Name:" />
        <WriteLine label="Last Name:" />
        <WriteLine label="Designation:" />
        <WriteLine label="Position/Title:" />
        <div className="sm:col-span-2">
          <p className="text-sm text-caisbe-text-dark">
            Company/Organization:{" "}
            <span className="text-caisbe-muted">({membershipApplicationCopy.organizationHint})</span>
          </p>
          <div className="mt-2 h-8 border-b border-caisbe-text-dark/40" />
        </div>
        <WriteLine label="Email:" />
        <WriteLine label="Mobile/Phone Number:" />
        <WriteLine label="Address:" />
        <WriteLine label="City:" />
        <WriteLine label="State/Province:" />
        <WriteLine label="Date of Birth:" />
        <WriteLine label="Zip/Mail Code:" />
        <WriteLine label="Country:" />
        <WriteLine label="Business Phone:" />
      </div>

      <SectionBar title="Base membership" />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
        {baseMembershipOptions.map((option) => (
          <CheckItem key={option.id} label={option.label} />
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-caisbe-text-dark">Chapter Membership</p>
      <div className="mt-3">
        <WriteLine label="Name of Chapter (if any)" />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
        {chapterMembershipOptions.map((option) => (
          <span key={option.id} className="inline-flex items-end gap-2 text-sm text-caisbe-text-dark">
            <span className="mb-1 inline-block h-3.5 w-3.5 shrink-0 border border-caisbe-text-dark" />
            {option.label} $
            <span className="mb-1 h-6 w-16 border-b border-caisbe-text-dark/40" />
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-caisbe-red">Additional Membership Options</p>
      <div className="mt-3 space-y-3">
        {additionalMembershipOptions.map((option) => (
          <div key={option.id} className="flex items-end gap-3">
            <span className="mb-1 inline-block h-3.5 w-3.5 shrink-0 border border-caisbe-text-dark" />
            <p className="shrink-0 text-sm text-caisbe-text-dark">{option.label}</p>
            <div className="mb-1 h-6 flex-1 border-b border-caisbe-text-dark/40" />
            <p className="shrink-0 text-sm text-caisbe-text-dark">$</p>
          </div>
        ))}
      </div>

      <SectionBar title="Payment information" />
      <p className="mt-4 text-sm text-caisbe-text">Dues payable in Canada funds. CAISBE</p>
      <div className="mt-3 flex flex-wrap gap-6">
        <CheckItem label="MasterCard" />
        <CheckItem label="Visa" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_0.8fr_0.6fr]">
        <WriteLine label="Card Number:" />
        <WriteLine label="Exp. (MM/YY):" />
        <WriteLine label="CVV:" />
      </div>
      <div className="mt-4">
        <WriteLine label="Card Authorized Name:" />
      </div>
      <div className="mt-4">
        <WriteLine label="Card Billing Street Address:" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <WriteLine label="Card Billing City, State/Province:" />
        <WriteLine label="Zip/Mail Code:" />
      </div>
      <div className="mt-4">
        <WriteLine label="Authorized Signature:" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <WriteLine label="Enclosed is check #:" />
        <WriteLine label="In the amount of CAD$:" />
      </div>

      <p className="mt-8 bg-caisbe-text-dark px-4 py-4 text-sm leading-6 text-white">
        {membershipApplicationCopy.agreement}
      </p>
    </article>
  );
}
