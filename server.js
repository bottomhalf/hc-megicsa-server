import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
  })
);

app.get("/", (req, res) => {
  res.send("API Running");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API healthy",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});