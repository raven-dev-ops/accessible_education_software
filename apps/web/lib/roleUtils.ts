export type AppRole = "admin" | "teacher" | "student";
export type AppSessionUser = {
  email?: string | null;
  name?: string | null;
  role?: AppRole;
};

function parseEmailList(envValue: string | undefined): string[] {
  return (envValue ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
const teacherEmails = parseEmailList(process.env.TEACHER_EMAILS);

export function deriveRoleFromEmail(email?: string | null): AppRole {
  const normalized = email?.toLowerCase() ?? "";
  if (normalized && adminEmails.includes(normalized)) {
    return "admin";
  }
  if (normalized && teacherEmails.includes(normalized)) {
    return "teacher";
  }
  return "student";
}

export function getRoleFromUser(user: AppSessionUser | null | undefined): AppRole {
  if (!user) return "student";
  if (user.role) return user.role;
  return deriveRoleFromEmail(user.email);
}

export function userHasRole(
  user: AppSessionUser | undefined,
  allowed: AppRole[]
): boolean {
  const role = getRoleFromUser(user);
  return allowed.includes(role);
}
