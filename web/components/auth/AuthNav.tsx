"use client";

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002";

export default function AuthNav() {
  return (
    <>
      <a href={`${PORTAL_URL}/login`} className="transition-colors hover:text-caisbe-red">
        Login
      </a>
      <a
        href={`${PORTAL_URL}/register`}
        className="font-semibold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
      >
        Register
      </a>
    </>
  );
}
