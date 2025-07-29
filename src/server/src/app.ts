import express, { Request, Response } from "express";
import driveRoutes from "./routes/driveRoutes.js";
import boxRoutes from "./routes/boxRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./middlewares/errorHandler.js";

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

app.use(errorHandler);

export default app;
