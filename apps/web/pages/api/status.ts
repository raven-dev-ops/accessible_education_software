import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimit } from "../../lib/rateLimiter";

type StatusResponse = {
  ok: boolean;
  app: "ok";
  dbEnabled: boolean;
  ocr: "not_configured" | "available" | "unavailable" | "error";
  message?: string;
  timestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { ok: false; message: string }>
) {
  const allowed = rateLimit(req, res, { limit: 60, windowMs: 5 * 60 * 1000 });
  if (!allowed) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ ok: false, message: "Method Not Allowed. Use GET." });
  }

  const dbEnabled = Boolean(process.env.DATABASE_URL);
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  const ocrApiKey = process.env.OCR_SERVICE_API_KEY;

  let ocrState: StatusResponse["ocr"] = "not_configured";
  let message: string | undefined;

  if (!ocrServiceUrl) {
    ocrState = "not_configured";
    message = "OCR service URL is not configured; running without backend OCR.";
  } else {
    try {
      const url = ocrServiceUrl.replace(/\/$/, "") + "/health";
      const response = await fetch(url, {
        headers: ocrApiKey ? { "x-api-key": ocrApiKey } : undefined,
      });
      if (!response.ok) {
        ocrState = "error";
        message = `OCR health check failed with status ${response.status}.`;
      } else {
        const data = (await response.json()) as { ocr_available?: boolean };
        if (data.ocr_available) {
          ocrState = "available";
          message = "OCR backend is reachable and reports availability.";
        } else {
          ocrState = "unavailable";
          message = "OCR backend is reachable but reports OCR as unavailable.";
        }
      }
    } catch (err) {
      console.error("Error calling OCR service from /api/status:", err);
      ocrState = "error";
      message = "Failed to reach OCR backend from /api/status.";
    }
  }

  return res.status(200).json({
    ok: true,
    app: "ok",
    dbEnabled,
    ocr: ocrState,
    message,
    timestamp: new Date().toISOString(),
  });
}

