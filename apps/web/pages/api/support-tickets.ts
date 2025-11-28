import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";

type SupportTicket = {
  id: string;
  detail: string;
  createdAt: string;
  score?: number | null;
  userEmail?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SupportTicket[] | SupportTicket | { error: string }>
) {
  if (req.method === "POST") {
    // Allow students/teachers/admins to create tickets
    const auth = await requireRole(req, res, ["admin", "teacher", "student"]);
    if (!auth) return;

    const detail = (req.body?.detail as string | undefined)?.trim();
    const score = typeof req.body?.score === "number" ? req.body.score : null;
    const userEmail = (req.body?.userEmail as string | undefined) ?? null;

    if (!detail) {
      return res.status(400).json({ error: "detail is required" });
    }

    const log = await prisma.log.create({
      data: {
        level: "support_ticket",
        message: detail,
        meta: {
          score,
          userEmail,
        },
      },
    });

    return res.status(201).json({
      id: log.id,
      detail: log.message,
      createdAt: log.createdAt.toISOString(),
      score: score ?? null,
      userEmail,
    });
  }

  if (req.method === "GET") {
    // Admin only list
    const auth = await requireRole(req, res, ["admin"]);
    if (!auth) return;

    const logs = await prisma.log.findMany({
      where: { level: "support_ticket" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped: SupportTicket[] = logs.map((log) => ({
      id: log.id,
      detail: log.message,
      createdAt: log.createdAt.toISOString(),
      score: (log.meta as any)?.score ?? null,
      userEmail: (log.meta as any)?.userEmail ?? null,
    }));

    return res.status(200).json(mapped);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
