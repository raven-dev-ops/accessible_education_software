import type { NextApiRequest, NextApiResponse } from "next";
import { requireRole } from "../../lib/apiAuth";
import { getBraille } from "../../lib/brailleServer";

type BrailleResponse =
  | { ok: true; braille: string; source: "liblouis" | "fallback"; message?: string }
  | { ok: false; error: string };

const MAX_INPUT_LENGTH = 8000;
const TABLE_ALLOWLIST = ["nemeth", "en-us-g1", "en-us-g2"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BrailleResponse>
) {
  const auth = await requireRole(req, res, ["student", "teacher", "admin"]);
  if (!auth) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body;
  const text = typeof body?.text === "string" ? body.text : "";
  const preferredEngine =
    body?.engine === "liblouis" || body?.engine === "fallback"
      ? body.engine
      : undefined;
  const table =
    typeof body?.table === "string" && body.table.trim().length > 0
      ? body.table.trim()
      : undefined;

  if (!text.trim()) {
    return res.status(400).json({ ok: false, error: "Text is required." });
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return res.status(413).json({
      ok: false,
      error: `Text too long. Limit is ${MAX_INPUT_LENGTH} characters.`,
    });
  }

  if (table && !TABLE_ALLOWLIST.includes(table)) {
    return res.status(400).json({
      ok: false,
      error: `Unsupported liblouis table. Allowed: ${TABLE_ALLOWLIST.join(", ")}`,
    });
  }

  const result = getBraille(text, table, preferredEngine);

  return res.status(200).json({
    ok: true,
    braille: result.braille,
    source: result.source,
    message: result.message,
  });
}

function safeJson(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
