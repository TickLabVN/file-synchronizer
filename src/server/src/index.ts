import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});
