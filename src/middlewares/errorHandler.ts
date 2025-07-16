import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err.code === "23505") {
    res.status(409).json({
      message: "Duplicate entry",
      detail: err.detail,
    });
    return;
  }

  console.error("❌ Unhandled Error:", err);

  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
};
