import { Response } from "express";

// This function logs an error and sends a response with the error message
// It checks if the error has a statusCode and message, and uses them if available
// Otherwise, it defaults to a 500 status code and a generic error message
// It also logs the error details to the console for debugging purposes
export default function errorHandler(err: unknown, res: Response): void {
    if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        "message" in err
    ) {
        const statusCode = (err as { statusCode?: number }).statusCode || 500;
        const message =
            (err as { message?: string }).message || "Unknown error";
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
