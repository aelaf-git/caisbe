import { portalMembershipLoginUrl, portalMembershipRegisterUrl } from "@/lib/api";

export default function AuthNav() {
  return (
    <div className="flex items-center gap-4 leading-none">
      <a
        href={portalMembershipLoginUrl()}
        className="inline-flex h-8 items-center font-medium text-caisbe-text transition-colors hover:text-caisbe-red"
      >
        Login
      </a>
      <a
        href={portalMembershipRegisterUrl()}
        className="inline-flex h-9 items-center rounded-full bg-caisbe-red px-4 text-base font-bold text-white transition hover:bg-caisbe-red-dark"
      >
        Register
      </a>
    </div>
  );
}
