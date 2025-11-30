import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { requireRole } from "../../lib/apiAuth";
import fallbackUploads from "../../data/sampleUploads.json";

type UploadSummary = {
  id: string;
  filename?: string | null;
  mimetype?: string | null;
  size?: number | null;
  status: string;
  createdAt?: string | null;
};

const allowSamples = process.env.ALLOW_SAMPLE_FALLBACKS === "true";
const dbEnabled = Boolean(process.env.DATABASE_URL);
const useCloudRun = process.env.USE_CLOUD_RUN_API === "true";
const cloudRunBase = process.env.CLOUD_RUN_API_BASE_URL;
const cloudRunApiKey = process.env.CLOUD_RUN_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadSummary[] | { error: string }>
) {
  const auth = await requireRole(req, res, ["admin"]);
  if (!auth) return;

  try {
    if (useCloudRun && cloudRunBase && cloudRunApiKey) {
      const url = `${cloudRunBase.replace(/\/$/, "")}/uploads`;
      const r = await fetch(url, {
        headers: { "x-api-key": cloudRunApiKey },
      });
      if (!r.ok) {
        console.error("Cloud Run /uploads failed:", r.status, await r.text().catch(() => ""));
      } else {
        const data = (await r.json()) as { ok: boolean; uploads?: UploadSummary[] };
        if (data.ok && data.uploads && data.uploads.length) {
          return res.status(200).json(data.uploads);
        }
      }
      // fall through to Prisma / samples on failure
    }

    if (!dbEnabled) {
      if (!allowSamples) {
        return res.status(503).json({ error: "Uploads unavailable (database disabled)." });
      }
      return res.status(200).json(fallbackUploads as UploadSummary[]);
    }

    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    type DbUpload = (typeof uploads)[number];

    if (!uploads.length) {
      if (!allowSamples) {
        return res.status(503).json({ error: "Uploads unavailable (samples disabled)." });
      }
      return res.status(200).json(fallbackUploads as UploadSummary[]);
    }

    const mapped: UploadSummary[] = uploads.map((u: DbUpload): UploadSummary => ({
      id: u.id,
      filename: u.filename,
      mimetype: u.mimetype,
      size: u.size,
      status: u.status,
      createdAt: u.createdAt?.toISOString?.() ?? null,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error("Falling back to mock uploads due to database error:", error);
    if (!allowSamples) {
      return res.status(503).json({ error: "Uploads unavailable (samples disabled)." });
    }
    return res.status(200).json(fallbackUploads as UploadSummary[]);
  }
}
