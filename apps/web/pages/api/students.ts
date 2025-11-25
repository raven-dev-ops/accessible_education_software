import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import fallbackStudents from "../../data/sampleStudents.json";

type StudentSummary = {
  id: string | number;
  name: string;
  email: string;
  course?: string;
};

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<StudentSummary[]>
) {
  try {
    const users = await prisma.user.findMany({
      where: { role: "student" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (!users.length) {
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
    console.error(
      "Falling back to mock students due to database error:",
      error
    );
    return res.status(200).json(fallbackStudents as StudentSummary[]);
  }
}
