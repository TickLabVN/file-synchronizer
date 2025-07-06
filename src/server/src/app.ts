import express, { Request, Response } from "express";
import driveRoutes from "./routes/driveRoutes";
import boxRoutes from "./routes/boxRoutes";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/auth/google", driveRoutes);
app.use("/auth/box", boxRoutes);
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

export default app;
