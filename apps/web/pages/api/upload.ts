import type { NextApiRequest, NextApiResponse } from "next";
import type formidable from "formidable";
import formidableFactory from "formidable";
import fs from "fs";

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

function getFirstFile(files: any): any | null {
  const value = files?.file ?? Object.values(files ?? {})[0];
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ ok: false, message: "Method Not Allowed. Use POST." });
  }

  const form = formidableFactory({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE_BYTES,
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
    if (!ocrServiceUrl) {
      console.log("Received upload (stub, OCR_SERVICE_URL not set):", fileInfos);
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
      return res.status(400).json({
        ok: false,
        message:
          "Unsupported file type. Please upload a PDF or image file.",
      });
    }

    try {
      const filepath: string = file.filepath || file.path;
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

      const url = ocrServiceUrl.replace(/\/$/, "") + "/ocr";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        console.error("OCR service error:", response.status, bodyText);
        return res.status(502).json({
          ok: false,
          message: "OCR service returned an error.",
        });
      }

      const data = (await response.json()) as {
        text?: string;
        filename?: string;
      };

      return res.status(200).json({
        ok: true,
        source: "ocr_service",
        message: "Upload processed by OCR service.",
        files: fileInfos,
        text: data.text ?? "",
      });
    } catch (uploadError) {
      console.error("Error calling OCR service:", uploadError);
      return res.status(500).json({
        ok: false,
        message: "Failed to send file to OCR service.",
      });
    }
  });
}
