export const membershipApplicationCopy = {
  dues: "Dues/One-year membership. CAISBE membership is individually based, and is nontransferable or refundable.",
  returnTo:
    "Return completed form with payment to: CAISBE, 815 4 AVE SW, Calgary, AB T2B 5N7, CANADA; or",
  email: "info@caisbe.org",
  organizationHint:
    "If full-time student, list college or university name and number of course hours enrolled",
  agreement:
    "By completing this membership application you agree to adhere to the CAISBE bylaws and code of ethics. For a complete copy of bylaws and code of ethics, visit CAISBE.org. Membership fees to CAISBE are not deductible as a charitable contribution for income tax purposes, but may be partially deductible as an ordinary business expense.",
  cardNotice:
    "Card number, expiry, and CVV are written only on the printed membership form. This website does not collect or store them.",
};

export const baseMembershipOptions = [
  { id: "professional", api: "professional", label: "Professional: CAD 100" },
  { id: "senior", api: "senior-fellow", label: "Senior member: CAD 100" },
  { id: "student", api: "student", label: "Student: CAD 50" },
  { id: "institutional", api: "institutional", label: "Institutional: CAD 100" },
  { id: "corporate", api: "corporate", label: "Corporate: CAD 100" },
] as const;

export const chapterMembershipOptions = [
  { id: "professional", label: "Professional" },
  { id: "senior", label: "Senior member" },
  { id: "student", label: "Student" },
  { id: "institutional", label: "Inst" },
  { id: "corporate", label: "Corporate" },
] as const;

export const additionalMembershipOptions = [
  { id: "africa", label: "Africa wide Membership (CAD 65)" },
  { id: "comesa", label: "COMESA Practice Membership" },
  { id: "magazine", label: "Mailed copy of CAISBE magazine (CAD 48)" },
] as const;

export type BaseMembershipId = (typeof baseMembershipOptions)[number]["id"];
export type AdditionalMembershipId = (typeof additionalMembershipOptions)[number]["id"];
