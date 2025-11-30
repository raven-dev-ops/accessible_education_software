import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackModules from "../../data/sampleModules.json";

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
  teacherProgress?: number;
  studentCompletion?: number;
  submodulesCompleted?: number;
  submodulesTotal?: number;
  ticketsOpen?: number;
  ticketsResolved?: number;
  sampleEquation?: string;
};

const useCloudRun = process.env.USE_CLOUD_RUN_API === "true";
const cloudRunBase = process.env.CLOUD_RUN_API_BASE_URL;
const cloudRunApiKey = process.env.CLOUD_RUN_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModuleSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["teacher", "admin"]);
  if (!auth) return;

  try {
    if (useCloudRun && cloudRunBase && cloudRunApiKey) {
      const url = `${cloudRunBase.replace(/\/$/, "")}/modules`;
      const r = await fetch(url, {
        headers: { "x-api-key": cloudRunApiKey },
      });
      if (!r.ok) {
        console.error("Cloud Run /modules failed:", r.status, await r.text().catch(() => ""));
      } else {
        const data = (await r.json()) as { ok: boolean; modules?: ModuleSummary[] };
        if (data.ok && data.modules && data.modules.length) {
          return res.status(200).json(data.modules);
        }
      }
      // fall through to Prisma / samples on failure
    }

    const modules = await prisma.module.findMany({
      include: { course: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (!modules.length) {
      return res
        .status(200)
        .json(fallbackModules as ModuleSummary[]);
    }

    const mapped: ModuleSummary[] = modules.map((m: any) => ({
      id: m.id,
      title: m.title,
      course: m.course?.name,
      teacherProgress: m.teacherProgress ?? undefined,
      studentCompletion: m.studentCompletion ?? undefined,
      submodulesCompleted: m.submodulesCompleted ?? undefined,
      submodulesTotal: m.submodulesTotal ?? undefined,
      ticketsOpen: m.ticketsOpen ?? undefined,
      ticketsResolved: m.ticketsResolved ?? undefined,
      sampleEquation: m.sampleEquation ?? undefined,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error(
      "Falling back to mock modules due to database error:",
      error
    );
    return res
      .status(200)
      .json(fallbackModules as ModuleSummary[]);
  }
}
