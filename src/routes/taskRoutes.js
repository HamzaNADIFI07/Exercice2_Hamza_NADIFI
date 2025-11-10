import { Router } from "express";
import { ToDoController } from "../controllers/todoController.js";
import { repoTasks } from "../config/db.js";
import { requireAuth } from "../config/auth.js";

const router = Router();
const todo = new ToDoController(repoTasks);

const asyncWrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const withIndex = (rows) => rows.map((t, i) => ({ index: i + 1, ...t }));

router.get("/health", (_req, res) => res.json({ status: "ok", message: "L'API fonctionne" }));
router.use(requireAuth);

// Toutes les routes /api/tasks nécessitent un JWT
router.get("/tasks", requireAuth, asyncWrap(async (req, res) => {
  res.json({ tasks: withIndex(await todo.list_tasks(req.userId)) });
}));

router.post("/tasks", requireAuth, asyncWrap(async (req, res) => {
  try {
    const t = await todo.add_task(req.userId, (req.body || {}).title ?? "");
    res.status(201).json({ message: "Tâche créée avec succès", task: t });
  } catch (e) {
    if (e.code === "VALUE_ERROR") return res.status(400).json({ error: e.message });
    throw e;
  }
}));

router.delete("/tasks/:index", requireAuth, asyncWrap(async (req, res) => {
  try {
    const title = await todo.delete_task(req.userId, req.params.index);
    res.status(200).json({ message: `Tâche supprimée : ${title}` });
  } catch (e) {
    if (e.code === "NOT_FOUND") return res.status(404).json({ error: `Tâche index=${req.params.index} introuvable.` });
    throw e;
  }
}));

export default router;
