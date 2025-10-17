import { Task } from "../../models/Task.js";

export class ToDoController {
  constructor() {
    this.next_id = 1;
    this.tasks = [];
  }
  // Liste toutes les tâches
  list_tasks() {
    return [...this.tasks];
  }
  // Trouve l'index d'une tâche par son id
  _find_index_by_id(task_id) {
    return this.tasks.findIndex((t) => t.id === task_id);
  }
  // Crée une nouvelle tâche
  add_task(title) {
    title = (title || "").trim();
    if (!title) {
      const err = new Error("Le titre ne peut pas être vide.");
      err.code = "VALUE_ERROR";
      throw err;
    }
    const new_task = new Task({ title, id: this.next_id });
    this.tasks.push(new_task);
    this.next_id += 1;
    return new_task;
  }

  // Supprime une tâche par ID
  delete_task(task_id) {
    const idx = this._find_index_by_id(task_id);
    if (idx < 0) {
      const err = new Error("Tâche introuvable.");
      err.code = "NOT_FOUND";
      throw err;
    }
    const removed = this.tasks.splice(idx, 1)[0];
    return removed.title;
  }
}
