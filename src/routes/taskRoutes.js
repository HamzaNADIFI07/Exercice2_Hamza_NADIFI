import { Router } from "express";
import { ToDoController } from "../controllers/todoController.js";

const router = Router();
const todo = new ToDoController();

function tasks_with_index() {
  const tasks = todo.list_tasks();
  return tasks.map((t, i) => ({ index: i + 1, ...t.to_dict() }));
}

// Vérification de l’état de l’API
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "L'API fonctionne" });
});

// Liste toutes les tâches
router.get("/api/tasks", (req, res) => {
  res.json({ tasks: tasks_with_index() });
});

// Crée une nouvelle tâche
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




// Supprime une tâche par ID
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
