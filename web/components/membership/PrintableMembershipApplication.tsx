import {
  additionalMembershipOptions,
  chapterMembershipOptions,
  membershipApplicationCopy,
  withBaseMembershipLabels,
  type MembershipCertificateTypePublic,
} from "@/lib/data/membershipApplication";
import { apiFetch } from "@/lib/api";
import { MEMBERSHIP_FORM_FR } from "@/lib/i18n/content/membership.fr";
import { getServerL } from "@/lib/i18n/server";

type Translate = (text: string) => string;

function WriteLine({ label, L }: { label: string; L: Translate }) {
  return (
    <div className="flex items-end gap-3">
      <p className="shrink-0 text-sm text-caisbe-text-dark">{L(label)}</p>
      <div className="mb-1 h-8 flex-1 border-b border-caisbe-text-dark/40" />
    </div>
  );
}

function CheckItem({ label, L }: { label: string; L: Translate }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-caisbe-text-dark">
      <span className="inline-block h-3.5 w-3.5 shrink-0 border border-caisbe-text-dark" />
      {L(label)}
    </span>
  );
}

function SectionBar({ title, L }: { title: string; L: Translate }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-caisbe-red bg-white" />
      <h2 className="font-hopewell-display text-sm font-bold uppercase tracking-wide text-caisbe-red">
        {L(title)}
      </h2>
      <span className="h-0.5 flex-1 bg-caisbe-red" />
    </div>
  );
}

function translatePriceLabel(label: string): string {
  const [name, price] = label.split(": ");
  const frName = MEMBERSHIP_FORM_FR[name] ?? name;
  if (!price) return frName;
  return `${frName} : ${price === "Free" ? MEMBERSHIP_FORM_FR.Free : price}`;
}

async function loadMembershipPrices(): Promise<MembershipCertificateTypePublic[]> {
  try {
    return await apiFetch<MembershipCertificateTypePublic[]>("/membership/certificate-types");
  } catch {
    return [];
  }
}

export default async function PrintableMembershipApplication({
  kind,
}: {
  kind: "application" | "renewal";
}) {
  const { L, locale } = await getServerL(MEMBERSHIP_FORM_FR);
  const title = L(kind === "renewal" ? "Membership Renewal" : "Membership Application");
  const prices = await loadMembershipPrices();
  const labeledBaseOptions = withBaseMembershipLabels(prices).map((option) => ({
    ...option,
    label: locale === "fr" ? translatePriceLabel(option.label) : option.label,
  }));

  return (
    <article className="bg-white p-8 print:p-0">
      <h1 className="font-hopewell-display text-3xl font-extrabold tracking-tight text-caisbe-text-dark">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-caisbe-text">{L(membershipApplicationCopy.dues)}</p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-caisbe-text">
        {L(membershipApplicationCopy.returnTo)}{" "}
        <span className="text-caisbe-red">{L("Email:")} {membershipApplicationCopy.email}</span>
      </p>

      <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {kind === "renewal" ? (
          <div className="sm:col-span-2">
            <WriteLine L={L} label="Membership number:" />
          </div>
        ) : null}
        <WriteLine L={L} label="First Name:" />
        <WriteLine L={L} label="Last Name:" />
        <WriteLine L={L} label="Designation:" />
        <WriteLine L={L} label="Position/Title:" />
        <div className="sm:col-span-2">
          <p className="text-sm text-caisbe-text-dark">
            {L("Company/Organization:")}{" "}
            <span className="text-caisbe-muted">({L(membershipApplicationCopy.organizationHint)})</span>
          </p>
          <div className="mt-2 h-8 border-b border-caisbe-text-dark/40" />
        </div>
        <WriteLine L={L} label="Email:" />
        <WriteLine L={L} label="Mobile/Phone Number:" />
        <WriteLine L={L} label="Address:" />
        <WriteLine L={L} label="City:" />
        <WriteLine L={L} label="State/Province:" />
        <WriteLine L={L} label="Date of Birth:" />
        <WriteLine L={L} label="Zip/Mail Code:" />
        <WriteLine L={L} label="Country:" />
        <WriteLine L={L} label="Business Phone:" />
      </div>

      <SectionBar L={L} title="Base membership" />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
        {labeledBaseOptions.map((option) => (
          <CheckItem key={option.id} L={L} label={option.label} />
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-caisbe-text-dark">{L("Chapter Membership")}</p>
      <div className="mt-3">
        <WriteLine L={L} label="Name of Chapter (if any)" />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
        {chapterMembershipOptions.map((option) => (
          <CheckItem key={option.id} L={L} label={option.label} />
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-caisbe-red">{L("Additional Membership Options")}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
        {additionalMembershipOptions.map((option) => (
          <CheckItem key={option.id} L={L} label={option.label} />
        ))}
      </div>

      <p className="mt-8 text-sm leading-6 text-caisbe-text">{L(membershipApplicationCopy.agreement)}</p>
    </article>
  );
}
