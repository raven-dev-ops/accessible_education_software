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
  scannedText?: string | null;
  correctedText?: string | null;
  fileName?: string | null;
};

const useCloudRun = process.env.USE_CLOUD_RUN_API === "true";
const cloudRunBase = process.env.CLOUD_RUN_API_BASE_URL;
const cloudRunApiKey = process.env.CLOUD_RUN_API_KEY;

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
          // Clean temp file safely (avoid path traversal by enforcing tmp dir prefix)
          try {
            const tmpRoot = path.resolve(os.tmpdir());
            const resolved = path.resolve(attachment.filepath);
            if (resolved.startsWith(tmpRoot)) {
              fs.unlinkSync(resolved);
            } else {
              console.warn("Skipped unlink for unexpected temp path", resolved);
            }
          } catch (unlinkErr) {
            console.warn("Failed to unlink temp attachment", unlinkErr);
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

    if (useCloudRun && cloudRunBase && cloudRunApiKey) {
      try {
        const url = `${cloudRunBase.replace(/\/$/, "")}/support-tickets`;
        const r = await fetch(url, {
          headers: { "x-api-key": cloudRunApiKey },
        });
        if (!r.ok) {
          console.error("Cloud Run /support-tickets failed:", r.status, await r.text().catch(() => ""));
        } else {
          const data = (await r.json()) as { ok: boolean; tickets?: SupportTicket[] };
          if (data.ok && data.tickets) {
            return res.status(200).json(data.tickets);
          }
        }
      } catch (err) {
        console.error("Cloud Run /support-tickets error:", err);
        // fall through to Prisma
      }
    }

    const logs = await prisma.log.findMany({
      where: { level: "support_ticket" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped: SupportTicket[] = logs.map((log: any) => ({
      id: log.id,
      detail: log.message,
      createdAt: log.createdAt.toISOString(),
      score: (log.meta as any)?.score ?? null,
      userEmail: (log.meta as any)?.userEmail ?? null,
      attachmentUrl: (log.meta as any)?.attachmentUrl ?? null,
      scannedText: (log.meta as any)?.scannedText ?? null,
      correctedText: (log.meta as any)?.correctedText ?? null,
      fileName: (log.meta as any)?.fileName ?? null,
    }));

    return res.status(200).json(mapped);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
