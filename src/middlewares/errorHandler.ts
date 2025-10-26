import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Handle PostgreSQL duplicate key error
  if (err.code === "23505") {
    res.status(409).json({
      message: "Duplicate entry",
      detail: err.detail,
    });
    return;
  }

  // Handle custom errors with statusCode (BadRequestError, NotFoundError, etc.)
  if (err.statusCode && typeof err.statusCode === "number") {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  // Handle errors with status (just in case)
  if (err.status && typeof err.status === "number") {
    res.status(err.status).json({
      message: err.message,
    });
    return;
  }

  // Fallback for unknown errors
  console.error("❌ Unhandled Error:", err);

  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
};
