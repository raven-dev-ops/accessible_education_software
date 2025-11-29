import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackStudents from "../../data/sampleStudents.json";

type StudentSummary = {
  id: string | number;
  name: string;
  email: string;
  course?: string | null;
  createdAt?: string | null;
};

const allowSamples = process.env.ALLOW_SAMPLE_FALLBACKS === "true";
const useCloudRun = process.env.USE_CLOUD_RUN_API === "true";
const cloudRunBase = process.env.CLOUD_RUN_API_BASE_URL;
const cloudRunApiKey = process.env.CLOUD_RUN_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["admin"]);
  if (!auth) return;

  try {
    if (useCloudRun && cloudRunBase && cloudRunApiKey) {
      const url = `${cloudRunBase.replace(/\/$/, "")}/students`;
      const r = await fetch(url, {
        headers: { "x-api-key": cloudRunApiKey },
      });
      if (!r.ok) {
        console.error("Cloud Run /students failed:", r.status, await r.text().catch(() => ""));
      } else {
        const data = (await r.json()) as { ok: boolean; students?: StudentSummary[] };
        if (data.ok && data.students && data.students.length) {
          return res.status(200).json(data.students);
        }
      }
      // fall through to Prisma / samples on failure
    }

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
      course: null,
      createdAt: user.createdAt?.toISOString?.() ?? null,
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
