import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("API Running");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API healthy"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});