import "dotenv/config";
import express from "express";
import tasksRouter from "./routes/taskRoutes.js";

const app = express();

app.use(express.json());
app.use("/", tasksRouter);

// 404
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.path })
);

// 500
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

export default app;
