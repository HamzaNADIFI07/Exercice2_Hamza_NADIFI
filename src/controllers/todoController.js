
const ERR = {
  EMPTY_TITLE: "Le titre ne peut pas être vide.",
  NOT_FOUND:   "Tâche introuvable.",
};

export class ToDoController {

  constructor(repo) {
    this.repo = repo;
  }
  
  // Liste toutes les tâches (ordonnées par created_at ASC)
  async list_tasks() {
    return this.repo.list();
  }

  // Ajoute une tâche
  async add_task(title) {
    title = (title || "").trim();
    if (!title) { const e = new Error(ERR.EMPTY_TITLE); e.code="VALUE_ERROR"; throw e; }
    return this.repo.create(title);
  }


  // Supprime une tâche
  async delete_task(index1) {
    const title = await this.repo.delete(index1);
    if (!title) { const e = new Error(ERR.NOT_FOUND); e.code="NOT_FOUND"; throw e; }
    return title;
  }
}
