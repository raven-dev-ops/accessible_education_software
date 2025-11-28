import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";
import { getRoleFromUser, type AppRole, type AppSessionUser } from "./roleUtils";

type AuthContext = {
  role: AppRole;
};

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

/**
 * Minimal helper to enforce Auth0-backed role checks on API routes.
 *
 * - If NEXT_PUBLIC_AUTH_ENABLED is not true, auth checks are skipped (useful
 *   for local or "Coming Soon" deployments).
 * - When enabled, requires a valid Auth0 session cookie and ensures the user
 *   has one of the allowed roles.
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: AppRole[]
): Promise<AuthContext | null> {
  if (!authEnabled) {
    // Auth is effectively disabled; allow access but label as student.
    return { role: "student" };
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      res
        .status(401)
        .json({ error: "Authentication required to access this resource." });
      return null;
    }

    const role = getRoleFromUser(session.user as AppSessionUser);

    if (!allowed.includes(role)) {
      res
        .status(403)
        .json({ error: "You do not have permission to access this resource." });
      return null;
    }

    return { role };
  } catch (error) {
    console.error("Error while enforcing API auth:", error);
    res
      .status(500)
      .json({ error: "Unable to verify authentication at this time." });
    return null;
  }
}
