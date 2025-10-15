import { Router } from "express";
import { ToDoController } from "../controllers/todoController.js";

const router = Router();
const todo = new ToDoController();

function tasks_with_index() {
  const tasks = todo.list_tasks();
  return tasks.map((t, i) => ({ index: i + 1, ...t.to_dict() }));
}

// GET /health
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "L'API fonctionne" });
});

// GET /api/tasks
router.get("/api/tasks", (req, res) => {
  res.json({ tasks: tasks_with_index() });
});

// POST /api/tasks  { title }
router.post("/api/tasks", (req, res) => {
  const data = req.body || {};
  const title = data.title ?? "";
  try {
    const t = todo.add_task(title);
    res.status(201).json({
      message: "Tâche créée avec succès",
      task: t.to_dict(),
    });
  } catch (e) {
    if (e.code === "VALUE_ERROR") {
      return res.status(400).json({ error: e.message });
    }
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/tasks/:task_id
router.get("/api/tasks/:task_id", (req, res) => {
  const task_id = Number(req.params.task_id);
  try {
    const t = todo.get_task(task_id);
    res.json(t.to_dict());
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ error: `Tâche id=${task_id} introuvable.` });
    }
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// DELETE /api/tasks/:task_id
router.delete("/api/tasks/:task_id", (req, res) => {
  const task_id = Number(req.params.task_id);
  try {
    const title = todo.delete_task(task_id);
    res.status(200).json({ message: `Tâche supprimée : ${title}` });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ error: `Tâche id=${task_id} introuvable.` });
    }
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
