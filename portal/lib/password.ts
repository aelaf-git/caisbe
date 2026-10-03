/** OWASP-aligned password rules shared by register and account change. */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const SPECIAL_RE = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/;
const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "password123!",
  "123456789012",
  "qwertyuiop12",
  "letmein12345",
  "welcome12345",
  "adminadmin12",
  "changeme1234",
  "iloveyou1234",
]);

export type PasswordChecks = {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
  notCommon: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  const value = password;
  return {
    minLength: value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: SPECIAL_RE.test(value),
    notCommon: !COMMON_PASSWORDS.has(value.toLowerCase()),
  };
}

export function passwordStrengthError(password: string, confirm?: string): string | null {
  if (password.trim() !== password) {
    return "Password cannot start or end with spaces.";
  }
  const checks = getPasswordChecks(password);
  if (!checks.minLength) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!checks.lowercase) return "Password must include at least one lowercase letter.";
  if (!checks.uppercase) return "Password must include at least one uppercase letter.";
  if (!checks.number) return "Password must include at least one number.";
  if (!checks.special) return "Password must include at least one special character.";
  if (!checks.notCommon) return "This password is too common. Choose a stronger password.";
  if (/^(.)\1+$/.test(password)) return "Password cannot be a repeated single character.";
  if (typeof confirm === "string" && password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export const PASSWORD_REQUIREMENTS = [
  { key: "minLength" as const, label: `At least ${MIN_PASSWORD_LENGTH} characters` },
  { key: "lowercase" as const, label: "One lowercase letter" },
  { key: "uppercase" as const, label: "One uppercase letter" },
  { key: "number" as const, label: "One number" },
  { key: "special" as const, label: "One special character (!@#$%^&*…)" },
];
