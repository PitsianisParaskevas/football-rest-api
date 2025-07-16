import type { RequestHandler } from "express";

// This lets you avoid using try/catch in every controller.
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
