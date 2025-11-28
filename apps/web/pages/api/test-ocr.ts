import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimit } from "../../lib/rateLimiter";

type TestOcrResponse = {
  ok: boolean;
  message: string;
  ocrAvailable?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestOcrResponse>
) {
  const allowed = rateLimit(req, res, { limit: 60, windowMs: 5 * 60 * 1000 });
  if (!allowed) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ ok: false, message: "Method Not Allowed. Use POST." });
  }

  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    console.log(
      "Test OCR endpoint invoked but OCR_SERVICE_URL is not set; returning stub response."
    );
    return res.status(200).json({
      ok: true,
      ocrAvailable: false,
      message:
        "OCR_SERVICE_URL is not configured. Set it in .env.local and start the Python OCR service to enable live OCR tests.",
    });
  }

  try {
    const url = ocrServiceUrl.replace(/\/$/, "") + "/health";
    const response = await fetch(url);
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error("OCR health check error:", response.status, bodyText);
      return res.status(502).json({
        ok: false,
        ocrAvailable: false,
        message: "OCR service health check failed.",
      });
    }
    const data = (await response.json()) as { ocr_available?: boolean };
    return res.status(200).json({
      ok: true,
      ocrAvailable: Boolean(data.ocr_available),
      message: data.ocr_available
        ? "OCR service is reachable and reports that OCR is available."
        : "OCR service is reachable but reports that OCR is not available.",
    });
  } catch (error) {
    console.error("Error calling OCR health endpoint:", error);
    return res.status(500).json({
      ok: false,
      ocrAvailable: false,
      message: "Failed to reach OCR service health endpoint.",
    });
  }
}
