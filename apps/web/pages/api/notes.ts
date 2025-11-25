import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import fallbackNotes from "../../data/sampleNotes.json";

type NoteSummary = {
  id: string | number;
  title: string;
  course?: string;
  module?: string;
  createdAt?: string;
  excerpt: string;
};

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<NoteSummary[]>
) {
  try {
    const notes = await prisma.note.findMany({
      include: {
        module: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    if (!notes.length) {
      return res
        .status(200)
        .json(fallbackNotes as NoteSummary[]);
    }

    const mapped: NoteSummary[] = notes.map((note: any) => {
      const courseName = note.module?.course?.name;
      const moduleTitle = note.module?.title;
      const title =
        moduleTitle || courseName || "Lecture note";

      const text: string = note.text || "";
      const excerpt =
        text.length > 160 ? `${text.slice(0, 157)}…` : text;

      return {
        id: note.id,
        title,
        course: courseName,
        module: moduleTitle,
        createdAt: note.createdAt?.toISOString?.() ?? undefined,
        excerpt
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    console.error(
      "Falling back to mock notes due to database error:",
      error
    );
    return res
      .status(200)
      .json(fallbackNotes as NoteSummary[]);
  }
}

