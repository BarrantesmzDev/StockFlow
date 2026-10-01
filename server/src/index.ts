import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "stockflow" });
});

app.listen(PORT, () => {
  console.log(`StockFlow API corriendo en http://localhost:${PORT}`);
});