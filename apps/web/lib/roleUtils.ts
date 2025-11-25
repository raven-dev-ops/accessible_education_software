import type { UserProfile } from "@auth0/nextjs-auth0/client";

export type AppRole = "admin" | "teacher" | "student";

function extractRawRoles(user: UserProfile): string[] {
  const anyUser = user as any;
  const claimKey = process.env.NEXT_PUBLIC_AUTH0_ROLES_CLAIM;
  const candidateKeys = claimKey ? [claimKey, "roles"] : ["roles"];

  const roles: string[] = [];
  for (const key of candidateKeys) {
    const value = anyUser?.[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        roles.push(String(item));
      }
    } else {
      roles.push(String(value));
    }
  }

  return roles;
}

export function getRoleFromUser(user: UserProfile | undefined): AppRole {
  if (!user) {
    return "student";
  }

  const rawRoles = extractRawRoles(user).map((r) => r.toLowerCase());

  if (rawRoles.includes("admin")) {
    return "admin";
  }

  if (rawRoles.includes("teacher")) {
    return "teacher";
  }

  if (rawRoles.includes("student")) {
    return "student";
  }

  const email = (user.email || "").toLowerCase();

  if (email.startsWith("admin")) {
    return "admin";
  }

  if (email.startsWith("teacher")) {
    return "teacher";
  }

  return "student";
}

export function userHasRole(
  user: UserProfile | undefined,
  allowed: AppRole[]
): boolean {
  const role = getRoleFromUser(user);
  return allowed.includes(role);
}
