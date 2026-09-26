import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, ContentSection } from "@/components/pages/ContentPage";
import { siteFullName, siteName } from "@/lib/data/home";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteName}`,
  description: `Privacy policy for the ${siteFullName} website.`,
};

const lastUpdated = "June 1, 2025";

const sections: {
  number: number;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[];
}[] = [
  {
    number: 1,
    title: "Who We Are",
    paragraphs: [
      `${siteFullName} (hereinafter "CAISBE", "we", "our", or "us") is an international knowledge, training, and professional development institute headquartered at 815-4AVE SW, Calgary, Alberta T2P 5N7, Canada.`,
      "We are committed to respecting your privacy and protecting your personal information in accordance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation.",
    ],
  },
  {
    number: 2,
    title: "Information We Collect",
    paragraphs: [
      "We may collect the following categories of personal information:",
    ],
    bullets: [
      "Identity & contact data: name, email address, postal address, telephone number, organization, and job title.",
      "Account data: login credentials and profile details when you register for the student portal or membership services.",
      "Financial data: payment card details processed securely through our third-party payment processor; we do not store full card numbers.",
      "Enrollment & membership history: courses, programs, memberships, amounts, dates, and related transaction records.",
      "Communications data: messages you send us via our contact form, email, newsletter signup, or social media.",
      "Technical data: IP address, browser type, operating system, pages visited, and time on site, collected automatically via cookies and analytics tools.",
    ],
  },
  {
    number: 3,
    title: "How We Use Your Information",
    paragraphs: ["We use your personal information to:"],
    bullets: [
      "Process course enrollments, memberships, and payments, and issue receipts or certificates where applicable.",
      "Send program updates, learning communications, event notices, and institutional newsletters (only with your consent or where permitted by law).",
      "Respond to your enquiries and provide learner or member support.",
      "Comply with legal obligations, including financial and regulatory reporting requirements.",
      "Improve our website, courses, and communications through anonymised analytics.",
      "Prevent fraud and ensure the security of our systems.",
    ],
  },
  {
    number: 4,
    title: "Legal Basis for Processing",
    paragraphs: [
      "We process your personal information on the following grounds: (a) your explicit consent where required; (b) performance of a contract (processing your enrollment, membership, or payment); (c) compliance with a legal obligation; and (d) our legitimate interests in operating an effective educational and professional institute, provided those interests are not overridden by your rights.",
    ],
  },
  {
    number: 5,
    title: "Sharing Your Information",
    paragraphs: [
      "We do not sell, rent, or trade your personal information. We may share it with:",
    ],
    bullets: [
      "Payment processors (e.g., Stripe) to complete your payment securely.",
      "Email platforms we use to send newsletters, receipts, and course communications, subject to data-processing agreements.",
      "Professional advisors (auditors, legal counsel) under strict confidentiality obligations.",
      "Regulatory authorities where required by law.",
    ],
    closing: [
      "All third-party service providers are required to protect your information and use it only for the purposes we specify.",
    ],
  },
  {
    number: 6,
    title: "Cookies & Tracking Technologies",
    paragraphs: [
      "Our website uses cookies and similar technologies to enhance your experience and analyse site traffic. You may control cookies through your browser settings; however, disabling certain cookies may affect site functionality.",
      "We use Google Analytics (with IP anonymisation enabled) to understand how visitors interact with our site. You may opt out via the Google Analytics Opt-out Browser Add-on.",
    ],
  },
  {
    number: 7,
    title: "Data Retention",
    paragraphs: [
      "We retain your personal information for as long as necessary to fulfil the purposes described in this policy, or as required by law. Enrollment, membership, and payment records are kept for a minimum of seven (7) years to comply with applicable financial and regulatory requirements. When no longer needed, data is securely deleted or anonymised.",
    ],
  },
  {
    number: 8,
    title: "Your Rights",
    paragraphs: ["You have the right to:"],
    bullets: [
      "Access the personal information we hold about you.",
      "Correct inaccurate or incomplete information.",
      "Withdraw consent at any time where processing is based on consent (e.g., unsubscribe from marketing emails).",
      "Request deletion of your data, subject to legal retention obligations.",
      "Lodge a complaint with the Office of the Privacy Commissioner of Canada (OPC) if you believe we have handled your information inappropriately.",
    ],
    closing: [
      "To exercise any of these rights, please contact us at info@caisbe.org.",
    ],
  },
  {
    number: 9,
    title: "Security",
    paragraphs: [
      "We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, or destruction. Payment transactions are encrypted using industry-standard TLS/SSL technology.",
    ],
  },
  {
    number: 10,
    title: "Third-Party Links",
    paragraphs: [
      "Our website may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies before submitting any personal information.",
    ],
  },
  {
    number: 11,
    title: "Children's Privacy",
    paragraphs: [
      "Our website is not directed at children under the age of 16. We do not knowingly collect personal information from children without verifiable parental consent. If you believe a child has provided us with personal information, please contact us so we can delete it.",
    ],
  },
  {
    number: 12,
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time. The revised version will be posted on this page with an updated "Last updated" date. Material changes will be notified by email to registered users where we hold your email address.',
    ],
  },
  {
    number: 13,
    title: "Contact Us",
    paragraphs: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Privacy Officer:",
      `${siteFullName} (CAISBE)\n815-4AVE SW, Calgary, Alberta T2P 5N7\nCanada\nEmail: info@caisbe.org`,
      "You may also contact the Office of the Privacy Commissioner of Canada if you have unresolved privacy concerns.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        lead={`How ${siteName} collects, uses, and protects personal information.`}
      >
        <p className="mt-3 text-sm font-semibold text-caisbe-muted">
          Last updated: {lastUpdated}
        </p>
      </PageHero>

      <ContentSection>
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.number} id={`section-${section.number}`}>
              <h2 className="font-display text-caisbe-text-dark text-xl font-semibold">
                {section.number}. {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 whitespace-pre-line text-base leading-7 text-caisbe-muted"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-caisbe-muted">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.closing?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-base leading-7 text-caisbe-muted"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-caisbe-muted">
          Return to the{" "}
          <Link
            href="/"
            className="font-semibold text-caisbe-red hover:underline"
          >
            home page
          </Link>{" "}
          or{" "}
          <Link
            href="/contact"
            className="font-semibold text-caisbe-red hover:underline"
          >
            contact us
          </Link>
          .
        </p>
      </ContentSection>
    </>
  );
}
