import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimit } from "../../lib/rateLimiter";
import { Storage } from "@google-cloud/storage";

type QaStatus = {
  status: "unknown" | "pass" | "fail";
  lastRunAt?: string | null;
  notes?: string | null;
};

type StorageStatus = "not_configured" | "available" | "error";

type StatusResponse = {
  ok: boolean;
  app: "ok";
  dbEnabled: boolean;
  ocr: "not_configured" | "available" | "unavailable" | "error";
  storage: StorageStatus;
  math: "not_configured" | "available" | "unavailable" | "error";
  message?: string;
  timestamp: string;
  qa: QaStatus;
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
  const bucketName = process.env.GCS_BUCKET;
  const mathInferenceUrl = process.env.MATH_INFERENCE_URL;

  let ocrState: StatusResponse["ocr"] = "not_configured";
  let storageState: StorageStatus = "not_configured";
  let mathState: StatusResponse["math"] = "not_configured";
  let message: string | undefined;

  const qaStatusEnv = (process.env.QA_STATUS || "unknown").toLowerCase();
  const qaStatus: QaStatus["status"] =
    qaStatusEnv === "pass" ? "pass" : qaStatusEnv === "fail" ? "fail" : "unknown";
  const qa: QaStatus = {
    status: qaStatus,
    lastRunAt: process.env.QA_LAST_RUN_AT ?? null,
    notes: process.env.QA_NOTES ?? null,
  };

  // OCR backend health
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

  // Cloud Storage health
  if (!bucketName) {
    storageState = "not_configured";
  } else {
    try {
      const storage = new Storage();
      const [exists] = await storage.bucket(bucketName).exists();
      storageState = exists ? "available" : "error";
    } catch (err) {
      console.error("Error checking GCS bucket from /api/status:", err);
      storageState = "error";
    }
  }

  // Math inference (DeepSeekMath) health
  if (!mathInferenceUrl) {
    mathState = "not_configured";
  } else {
    try {
      const url = mathInferenceUrl.replace(/\/$/, "") + "/health";
      const response = await fetch(url);
      if (!response.ok) {
        mathState = "error";
      } else {
        const data = (await response.json()) as { status?: string; component?: string };
        mathState =
          data.status === "ok" && data.component === "math-inference"
            ? "available"
            : "unavailable";
      }
    } catch (err) {
      console.error("Error calling math inference service from /api/status:", err);
      mathState = "error";
    }
  }

  return res.status(200).json({
    ok: true,
    app: "ok",
    dbEnabled,
    ocr: ocrState,
    storage: storageState,
    math: mathState,
    message,
    timestamp: new Date().toISOString(),
    qa,
  });
}
