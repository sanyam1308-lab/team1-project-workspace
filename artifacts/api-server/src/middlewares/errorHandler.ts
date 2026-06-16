import type { ErrorRequestHandler } from "express";

interface ZodLikeIssue {
  path: (string | number)[];
  message: string;
}

function isZodError(
  err: unknown,
): err is { name: string; issues: ZodLikeIssue[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (isZodError(err)) {
    const message = err.issues
      .map((i) => {
        const path = i.path.join(".");
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join("; ");
    res.status(400).json({ error: message || "Invalid request" });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
