import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackModules from "../../data/sampleModules.json";

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModuleSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["teacher", "admin"]);
  if (!auth) return;

  try {
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
