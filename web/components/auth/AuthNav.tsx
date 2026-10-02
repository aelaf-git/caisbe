const PORTAL_URL = (
  process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002"
).replace(/\/$/, "");

export default function AuthNav() {
  return (
    <div className="flex items-center gap-4 leading-none">
      <a
        href={`${PORTAL_URL}/login`}
        className="inline-flex h-8 items-center font-medium text-caisbe-text transition-colors hover:text-caisbe-red"
      >
        Login
      </a>
      <a
        href="/membership/become-a-member"
        className="inline-flex h-8 items-center rounded-full bg-caisbe-red px-4 text-sm font-bold text-white transition hover:bg-caisbe-red-dark"
      >
        Register
      </a>
    </div>
  );
}
