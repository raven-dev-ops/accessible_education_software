import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackNotes from "../../data/sampleNotes.json";

type NoteSummary = {
  id: string | number;
  title: string;
  course?: string;
  module?: string;
  createdAt?: string;
  excerpt: string;
};

const allowSamples = process.env.ALLOW_SAMPLE_FALLBACKS === "true";
const dbEnabled = Boolean(process.env.DATABASE_URL);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NoteSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["student", "teacher", "admin"]);
  if (!auth) return;

  try {
    if (!dbEnabled) {
      if (!allowSamples) {
        return res.status(503).json({ error: "Notes unavailable (database disabled)." });
      }
      return res.status(200).json(fallbackNotes as NoteSummary[]);
    }

    const notes = await prisma.note.findMany({
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (!notes.length) {
      if (!allowSamples) {
        return res.status(503).json({ error: "Notes unavailable (samples disabled)." });
      }
      return res.status(200).json(fallbackNotes as NoteSummary[]);
    }

    const mapped: NoteSummary[] = notes.map((note: any) => {
      const courseName = note.module?.course?.name;
      const moduleTitle = note.module?.title;
      const title = moduleTitle || courseName || "Lecture note";

      const text: string = note.text || "";
      const excerpt =
        text.length > 160 ? `${text.slice(0, 157)}…` : text;

      return {
        id: note.id,
        title,
        course: courseName,
        module: moduleTitle,
        createdAt: note.createdAt?.toISOString?.() ?? undefined,
        excerpt,
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    console.error("Notes load failed:", error);
    if (!allowSamples) {
      return res.status(503).json({ error: "Notes unavailable (samples disabled)." });
    }
    return res.status(200).json(fallbackNotes as NoteSummary[]);
  }
}
