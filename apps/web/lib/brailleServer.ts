import { spawnSync } from "child_process";
import { textToBraille } from "./braille";

type BrailleEngine = "liblouis" | "fallback";

type BrailleResult = {
  source: BrailleEngine;
  braille: string;
  message?: string;
};

function runLiblouis(
  text: string,
  table: string | undefined
): BrailleResult | null {
  const bin = process.env.BRAILLE_LIBLOUIS_BIN || "lou_translate";
  const tableArg = table || process.env.BRAILLE_LIBLOUIS_TABLE || "nemeth";

  try {
    const result = spawnSync(bin, [tableArg], {
      input: text,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });

    if (result.status === 0 && typeof result.stdout === "string") {
      const cleaned = result.stdout.trim();
      if (cleaned.length) {
        return {
          source: "liblouis",
          braille: cleaned,
          message: `Used liblouis (${tableArg})`,
        };
      }
    }

    const stderr = (result.stderr || "").toString().trim();
    console.error(
      "liblouis translation failed",
      result.status,
      stderr || "(no stderr)"
    );
    return null;
  } catch (error) {
    console.error("liblouis not available or failed to run:", error);
    return null;
  }
}

export function getBraille(
  text: string,
  table?: string,
  preferred?: BrailleEngine
): BrailleResult {
  const wantLiblouis =
    preferred === "liblouis" ||
    process.env.BRAILLE_ENGINE === "liblouis" ||
    Boolean(process.env.BRAILLE_LIBLOUIS_TABLE);

  if (wantLiblouis) {
    const liblouisResult = runLiblouis(text, table);
    if (liblouisResult) return liblouisResult;
  }

  return {
    source: "fallback",
    braille: textToBraille(text),
    message:
      preferred === "liblouis"
        ? "liblouis unavailable; using fallback Grade 1 mapper. Install liblouis and set BRAILLE_ENGINE=liblouis to enable Nemeth."
        : "Using fallback Grade 1 mapper. Set BRAILLE_ENGINE=liblouis and install liblouis to enable Nemeth.",
  };
}
