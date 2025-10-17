export class Task {
  constructor({ title, created_at = null }) {
    this.title = (title || "").trim();
    this.created_at =
      created_at || new Date().toISOString().slice(0, 19).replace("T", " ");
  }
}
