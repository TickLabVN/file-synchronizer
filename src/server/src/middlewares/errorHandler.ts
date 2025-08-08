import { Response } from "express";

/**
 * Error handler middleware for Express applications.
 * It checks if the error has a statusCode and message, and responds accordingly.
 * If not, it defaults to a 500 status code with a generic error message.
 * It also logs the error details to the console for debugging purposes.
 * @param {unknown} err - The error object, which can be of any type.
 * @param {Response} res - The Express response object used to send the error response.
 * @return {void} - This function does not return a value; it sends a response directly.
 */
export default function errorHandler(err: unknown, res: Response): void {
  if (err && typeof err === "object" && "statusCode" in err && "message" in err) {
    const statusCode = (err as { statusCode?: number }).statusCode || 500;
    const message = (err as { message?: string }).message || "Unknown error";
    res.status(statusCode).json({ error: message });
  } else {
    res.status(500).json({ error: "Unknown error" });
  }
  console.error("Error:", err);
  if (err instanceof Error) {
    console.error("Error message:", err.message);
    console.error("Stack trace:", err.stack);
  } else {
    console.error("Error details:", err);
  }
}
