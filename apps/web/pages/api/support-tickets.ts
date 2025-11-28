import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import formidable from "formidable";
import { Storage } from "@google-cloud/storage";
import path from "path";
import os from "os";
import fs from "fs";

type SupportTicket = {
  id: string;
  detail: string;
  createdAt: string;
  score?: number | null;
  userEmail?: string | null;
  attachmentUrl?: string | null;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

function getStorage(): Storage | null {
  const key = process.env.GCS_SA_KEY;
  if (key) {
    try {
      const creds = JSON.parse(key);
      return new Storage({ credentials: creds });
    } catch (e) {
      console.error("Failed to parse GCS_SA_KEY", e);
      return null;
    }
  }
  // Fallback to default credentials if available
  return new Storage();
}

async function uploadAttachment(filePath: string, filename: string): Promise<string | null> {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) return null;
  const storage = getStorage();
  if (!storage) return null;
  const bucket = storage.bucket(bucketName);
  const dest = `support/${Date.now()}-${filename}`;
  await bucket.upload(filePath, {
    destination: dest,
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });
  const [url] = await bucket.file(dest).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  return url;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SupportTicket[] | SupportTicket | { error: string }>
) {
  if (req.method === "POST") {
    const apiKey = req.headers["x-api-key"];
    const hasApiKey =
      process.env.SUPPORT_TICKET_API_KEY &&
      apiKey === process.env.SUPPORT_TICKET_API_KEY;

    if (!hasApiKey) {
      const auth = await requireRole(req, res, ["admin", "teacher", "student"]);
      if (!auth) return;
    }

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: os.tmpdir(),
    });

    form.parse(req, async (err: any, fields: any, files: any) => {
      if (err) {
        console.error("Support ticket parse error", err);
        return res.status(400).json({ error: "Invalid form data" });
      }

      const detail = (fields.detail as string | undefined)?.trim();
      const scoreRaw = fields.score as string | undefined;
      const score = scoreRaw ? Number(scoreRaw) : null;
      const userEmail = (fields.userEmail as string | undefined) ?? null;

      if (!detail) {
        return res.status(400).json({ error: "detail is required" });
      }

      let attachmentUrl: string | null = null;
      const attachment = files.attachment as any;
      if (attachment && attachment.filepath && attachment.originalFilename) {
        try {
          attachmentUrl = await uploadAttachment(
            attachment.filepath,
            path.basename(attachment.originalFilename)
          );
        } catch (uploadErr) {
          console.error("Attachment upload failed", uploadErr);
        } finally {
          // Clean temp file
          try {
            fs.unlinkSync(attachment.filepath);
          } catch {
            /* ignore */
          }
        }
      }

      const log = await prisma.log.create({
        data: {
          level: "support_ticket",
          message: detail,
          meta: {
            score,
            userEmail,
            attachmentUrl,
          },
        },
      });

      return res.status(201).json({
        id: log.id,
        detail: log.message,
        createdAt: log.createdAt.toISOString(),
        score: score ?? null,
        userEmail,
        attachmentUrl,
      });
    });
    return;
  }

  if (req.method === "GET") {
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
      attachmentUrl: (log.meta as any)?.attachmentUrl ?? null,
    }));

    return res.status(200).json(mapped);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
