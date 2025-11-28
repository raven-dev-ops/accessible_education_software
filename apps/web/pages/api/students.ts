import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackStudents from "../../data/sampleStudents.json";

type StudentSummary = {
  id: string | number;
  name: string;
  email: string;
  course?: string;
};

const allowSamples = process.env.ALLOW_SAMPLE_FALLBACKS === "true";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["admin"]);
  if (!auth) return;

  try {
    const users = await prisma.user.findMany({
      where: { role: "student" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (!users.length) {
      if (!allowSamples) {
        return res.status(503).json({ error: "Students unavailable (samples disabled)." });
      }
      return res.status(200).json(fallbackStudents as StudentSummary[]);
    }

    const mapped: StudentSummary[] = users.map((user: any) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      // Placeholder: real course/module associations will be wired later.
      course: undefined,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error("Students load failed:", error);
    if (!allowSamples) {
      return res.status(503).json({ error: "Students unavailable (samples disabled)." });
    }
    return res.status(200).json(fallbackStudents as StudentSummary[]);
  }
}
