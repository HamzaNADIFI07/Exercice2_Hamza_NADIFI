import { Router } from "express";
import { ToDoController } from "../controllers/todoController.js";

const router = Router();
const todo = new ToDoController();

const asyncWrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Health
router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "L'API fonctionne" });
});

// helper pour ajouter l'index 1-based
function withIndex(rows) {
  return rows.map((t, i) => ({ index: i + 1, ...t }));
}

// GET /api/tasks
router.get("/api/tasks", asyncWrap(async (_req, res) => {
  const tasks = await todo.list_tasks();
  res.json({ tasks: withIndex(tasks) });
}));

// POST /api/tasks  { title }
router.post("/api/tasks", asyncWrap(async (req, res) => {
  try {
    const t = await todo.add_task((req.body || {}).title ?? "");
    res.status(201).json({ message: "Tâche créée avec succès", task: t });
  } catch (e) {
    if (e.code === "VALUE_ERROR") return res.status(400).json({ error: e.message });
    throw e;
  }
}));


// DELETE /api/tasks/:index
router.delete("/api/tasks/:index", asyncWrap(async (req, res) => {
  try {
    const title = await todo.delete_task(req.params.index);
    res.status(200).json({ message: `Tâche supprimée : ${title}` });
  } catch (e) {
    if (e.code === "NOT_FOUND")
      return res.status(404).json({ error: `Tâche index=${req.params.index} introuvable.` });
    throw e;
  }
}));

export default router;
