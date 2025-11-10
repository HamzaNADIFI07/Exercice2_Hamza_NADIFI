import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import cookieParser from 'cookie-parser';
import authRouter from "./routes/authRoutes.js";
import tasksRouter from "./routes/taskRoutes.js";
import { requireAuth } from "./config/auth.js";

import swaggerDocument from "./swagger.json" with { type: "json" };

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API up" });
});



// Routes
app.use("/auth", authRouter); // /auth/register, /auth/login
app.use("/api",requireAuth, tasksRouter); // /api/tasks (protégé)

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.path })
);

// 500
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Erreur serveur",
  });
});

export default app;
