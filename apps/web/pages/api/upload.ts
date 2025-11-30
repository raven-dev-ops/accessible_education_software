import type { NextApiRequest, NextApiResponse } from "next";
import type formidable from "formidable";
import formidableFactory from "formidable";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "../../lib/db";
import { rateLimit } from "../../lib/rateLimiter";

export const config = {
  api: {
    bodyParser: false,
  },
};

type UploadedFileInfo = {
  field: string;
  originalFilename?: string | null;
  size?: number;
};

type UploadResponse = {
  ok: boolean;
  message: string;
  files?: UploadedFileInfo[];
  text?: string;
  source?: "stub" | "ocr_service";
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_TMP_DIR =
  process.env.FILE_UPLOAD_TMP_DIR || os.tmpdir();
const DB_ENABLED = Boolean(process.env.DATABASE_URL);

async function ensureUploadDir(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
}

function getFirstFile(files: any): any | null {
  const value = files?.file ?? Object.values(files ?? {})[0];
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

type UploadStatus = "RECEIVED" | "PROCESSING" | "COMPLETE" | "FAILED";

async function recordUpload(opts: {
  filename?: string | null;
  mimetype?: string | null;
  size?: number;
  status: UploadStatus;
  ocrText?: string | null;
}) {
  if (!DB_ENABLED) return;
  try {
    await prisma.upload.create({
      data: {
        filename: opts.filename ?? null,
        mimetype: opts.mimetype ?? null,
        size: opts.size ?? null,
        status: opts.status,
        ocrText: opts.ocrText ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to persist upload metadata:", error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  const allowed = rateLimit(req, res, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (!allowed) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ ok: false, message: "Method Not Allowed. Use POST." });
  }

  try {
    await ensureUploadDir(UPLOAD_TMP_DIR);
  } catch (dirError) {
    console.error("Failed to prepare upload directory:", dirError);
    return res.status(500).json({
      ok: false,
      message: "File upload directory is not available.",
    });
  }

  const form = formidableFactory({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    uploadDir: UPLOAD_TMP_DIR,
  });

  form.parse(req, async (err: unknown, _fields: any, files: any) => {
    if (err) {
      console.error("File upload parse error:", err);
      return res
        .status(500)
        .json({ ok: false, message: "Failed to parse uploaded file." });
    }

    const fileInfos: UploadedFileInfo[] = [];
    Object.entries(files || {}).forEach(([field, value]) => {
      if (!value) return;
      const list = Array.isArray(value) ? value : [value];
      list.forEach((file: any) => {
        fileInfos.push({
          field,
          originalFilename: file.originalFilename ?? null,
          size: typeof file.size === "number" ? file.size : undefined,
        });
      });
    });

    const ocrServiceUrl = process.env.OCR_SERVICE_URL;
    const ocrApiKey = process.env.OCR_SERVICE_API_KEY;
    if (!ocrServiceUrl) {
      console.log("Received upload (stub, OCR_SERVICE_URL not set):", fileInfos);
      void recordUpload({
        filename: fileInfos[0]?.originalFilename ?? null,
        mimetype: null,
        size: fileInfos[0]?.size,
        status: "COMPLETE",
        ocrText: null,
      });
      return res.status(200).json({
        ok: true,
        source: "stub",
        message:
          "Upload received. OCR_SERVICE_URL is not configured, so this is a log-only stub response.",
        files: fileInfos,
      });
    }

    const file = getFirstFile(files);
    if (!file) {
      return res.status(400).json({
        ok: false,
        message: "No file field found in upload.",
      });
    }

    const size =
      typeof file.size === "number" ? file.size : undefined;
    if (size && size > MAX_FILE_SIZE_BYTES) {
      void recordUpload({
        filename: file.originalFilename ?? null,
        mimetype: file.mimetype ?? null,
        size,
        status: "FAILED",
      });
      return res.status(413).json({
        ok: false,
        message: "File too large. Maximum allowed size is 10MB.",
      });
    }

    const mimetype: string = file.mimetype || "";
    if (
      !(
        mimetype === "application/pdf" ||
        mimetype.startsWith("image/")
      )
    ) {
      void recordUpload({
        filename: file.originalFilename ?? null,
        mimetype: file.mimetype ?? null,
        size,
        status: "FAILED",
      });
      return res.status(400).json({
        ok: false,
        message:
          "Unsupported file type. Please upload a PDF or image file.",
      });
    }

    try {
      const rawPath: string = file.filepath || file.path;
      const filepath = path.resolve(rawPath);
      const safeBase = path.resolve(UPLOAD_TMP_DIR);

      if (!filepath.startsWith(safeBase + path.sep)) {
        console.error(
          "Rejected upload file path outside allowed directory",
          filepath
        );
        return res.status(400).json({
          ok: false,
          message: "Invalid upload path.",
        });
      }

      const buffer = await fs.promises.readFile(filepath);
      const blob = new Blob([buffer], {
        type: file.mimetype || "application/octet-stream",
      });
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        file.originalFilename || "upload.bin"
      );

      const url = ocrServiceUrl.replace(/\/$/, "") + "/ocr-file";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: ocrApiKey ? { "x-api-key": ocrApiKey } : undefined,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        console.error("OCR service error:", response.status, bodyText);
        void recordUpload({
          filename: file.originalFilename ?? null,
          mimetype: file.mimetype ?? null,
          size,
          status: "FAILED",
        });
        return res.status(502).json({
          ok: false,
          message: "OCR service returned an error.",
        });
      }

      const data = (await response.json()) as {
        text?: string;
        filename?: string;
      };

      void recordUpload({
        filename: file.originalFilename ?? null,
        mimetype: file.mimetype ?? null,
        size,
        status: "COMPLETE",
        ocrText: data.text ?? null,
      });

      return res.status(200).json({
        ok: true,
        source: "ocr_service",
        message: "Upload processed by OCR service.",
        files: fileInfos,
        text: data.text ?? "",
      });
    } catch (uploadError) {
      console.error("Error calling OCR service:", uploadError);
      void recordUpload({
        filename: file?.originalFilename ?? null,
        mimetype: file?.mimetype ?? null,
        size: typeof file?.size === "number" ? file.size : undefined,
        status: "FAILED",
      });
      return res.status(500).json({
        ok: false,
        message: "Failed to send file to OCR service.",
      });
    }
  });
}
