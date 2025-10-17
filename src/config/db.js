// src/config/db.js
import 'dotenv/config';

const provider = (process.env.DB_PROVIDER || 'postgres').toLowerCase();

let repo;

if (provider === 'mongo') {
  // --- MONGO ---
  const { default: mongoose } = await import('mongoose');

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todo';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  const TaskSchema = new mongoose.Schema(
    { title: { type: String, required: true, trim: true } },
    { timestamps: { createdAt: 'created_at', updatedAt: false } }
  );
  const TaskModel = mongoose.model('Task', TaskSchema);

  repo = {
    async list() {
      const rows = await TaskModel.find().sort({ created_at: 1 }).lean();
      return rows.map(r => ({
        title: r.title,
        created_at: new Date(r.created_at).toISOString().slice(0,19).replace('T',' ')
      }));
    },
    async create(title) {
      const t = await TaskModel.create({ title });
      return {
        title: t.title,
        created_at: new Date(t.created_at).toISOString().slice(0,19).replace('T',' ')
      };
    },
    async delete(index1) {
      const i0 = Number(index1) - 1;
      const rows = await TaskModel.find().sort({ created_at: 1 }).skip(i0).limit(1);
      const doc = rows[0];
      if (!doc) return null;
      const title = doc.title;
      await TaskModel.deleteOne({ _id: doc._id });
      return title;
    }
  };

  console.log('✅ MongoDB connecté');
} else {
  // --- POSTGRES ---
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error('DATABASE_URL manquant pour Postgres');
  }

  const pool = new Pool({ connectionString: connStr });
  await pool.query('select 1');

  // ensure schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks(
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);`);

  const q = (text, params) => pool.query(text, params);

  repo = {
    async list() {
      const { rows } = await q(`
        SELECT title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM tasks
        ORDER BY created_at ASC
      `);
      return rows;
    },
    async create(title) {
      const { rows } = await q(`
        INSERT INTO tasks(title) VALUES ($1)
        RETURNING title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at
      `, [title]);
      return rows[0];
    },
    async delete(index1) {
      const i0 = Number(index1) - 1;
      const idRes = await q(`
        SELECT id, title FROM tasks ORDER BY created_at ASC OFFSET $1 LIMIT 1
      `, [i0]);
      const row = idRes.rows[0]; if (!row) return null;
      await q(`DELETE FROM tasks WHERE id=$1`, [row.id]);
      return row.title;
    }
  };

  console.log('✅ PostgreSQL connecté');
}

export { repo };
