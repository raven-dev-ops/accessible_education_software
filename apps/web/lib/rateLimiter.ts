import type { NextApiRequest, NextApiResponse } from "next";

type Window = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Window>();

function getClientKey(req: NextApiRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0];
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Basic in-memory rate limiter (per-process). Suitable for lightweight protection
 * of Next.js API routes in serverless contexts. For production-grade/global limits,
 * use a shared store (Redis, Cloud Memorystore, etc.).
 */
export function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  {
    limit,
    windowMs,
  }: {
    limit: number;
    windowMs: number;
  }
): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    res.setHeader("Retry-After", Math.ceil((existing.expiresAt - now) / 1000));
    res
      .status(429)
      .json({ error: "Too many requests. Please slow down and try again." });
    return false;
  }

  existing.count += 1;
  buckets.set(key, existing);
  return true;
}
