import { query } from "../config/db.js";

const ERR = {
  EMPTY_TITLE: "Le titre ne peut pas être vide.",
  NOT_FOUND:   "Tâche introuvable.",
};

export class ToDoController {

  // Liste toutes les tâches (ordonnées par created_at ASC)
  async list_tasks() {
    const { rows } = await query(
      `SELECT title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at
       FROM tasks
       ORDER BY created_at ASC`
    );
    return rows;
  }

  // Ajoute une tâche
  async add_task(title) {
    title = (title || "").trim();
    if (!title) {
      const e = new Error(ERR.EMPTY_TITLE);
      e.code = "VALUE_ERROR";
      throw e;
    }
    const { rows } = await query(
      `INSERT INTO tasks(title) VALUES ($1)
       RETURNING title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at`,
      [title]
    );
    return rows[0];
  }


  // Supprime une tâche
  async delete_task(index1) {
    const i0 = Number(index1) - 1;
    if (!Number.isInteger(i0) || i0 < 0) {
      const e = new Error(ERR.NOT_FOUND);
      e.code = "NOT_FOUND";
      throw e;
    }
    // trouver l'id
    const idRes = await query(
      `SELECT id, title FROM tasks
       ORDER BY created_at ASC
       OFFSET $1 LIMIT 1`,
      [i0]
    );
    const row = idRes.rows[0];
    if (!row) {
      const e = new Error(ERR.NOT_FOUND);
      e.code = "NOT_FOUND";
      throw e;
    }

    await query(`DELETE FROM tasks WHERE id=$1`, [row.id]);
    return row.title;
  }
}
