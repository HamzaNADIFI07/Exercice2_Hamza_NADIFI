import 'dotenv/config';

// AUTH: MongoDB
const { default: mongoose } = await import('mongoose');

const AUTH_URI =
  process.env.MONGODB_URI_AUTH ||
  'mongodb://127.0.0.1:27017/todo_auth';

mongoose.set('strictQuery', true);

// On garde une seule connexion mongoose pour l'auth (et éventuellement tasks si provider === 'mongo')
const mongoAuthConn = await mongoose.createConnection(AUTH_URI).asPromise();

// Modèle User pour l’auth (email unique + password hashé)
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const UserModel = mongoAuthConn.model('User', userSchema);

// Le hash est géré en dehors, ici on stocke et on charge
export const authRepo = {
  async createUser({ email, passwordHash }) {
    const u = await UserModel.create({ email, passwordHash });
    return { id: u._id.toString(), email: u.email, created_at: u.created_at };
  },
  async findByEmail(email) {
    const u = await UserModel.findOne({ email }).lean();
    if (!u) return null;
    return { id: u._id.toString(), email: u.email, passwordHash: u.passwordHash, created_at: u.created_at };
  },
  async findById(id) {
    const u = await UserModel.findById(id).lean();
    if (!u) return null;
    return { id: u._id.toString(), email: u.email, passwordHash: u.passwordHash, created_at: u.created_at };
  },
  async listUsers({ page = 1, limit = 50 } = {}) {
    const p = Math.max(1, Number(page));
    const l = Math.min(100, Math.max(1, Number(limit)));
    const docs = await UserModel
      .find({})
      .sort({ created_at: 1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean();
  
    const items = docs.map(u => ({
      id: u._id.toString(),
      email: u.email,
      created_at: u.created_at,
    }));
  
    const total = await UserModel.estimatedDocumentCount();
    return {
      page: p,
      limit: l,
      total,
      items,
    };
  },
};

// Tasks: MongoDB / Postrge / Memory
const provider = (process.env.DB_PROVIDER || 'postgres').toLowerCase();

let repoTasks;
let pgPool = null;
let mongoTasksConn = null;

if (provider === 'memory') {
  // Memory
  const store = new Map(); // userId -> [{title, created_at}]
  const box = (userId) => {
    if (!store.has(userId)) store.set(userId, []);
    return store.get(userId);
  };

  repoTasks = {
    async list(userId) {
      const rows = box(userId).slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      return rows;
    },
    async create(userId, title) {
      const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const row = { title, created_at };
      box(userId).push(row);
      return row;
    },
    async delete(userId, index1) {
      const i0 = Number(index1) - 1;
      const arr = box(userId);
      const sorted = arr.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
      const item = sorted[i0];
      if (!item) return null;
      const pos = arr.findIndex(r => r.title === item.title && r.created_at === item.created_at);
      if (pos === -1) return null;
      const [removed] = arr.splice(pos, 1);
      return removed?.title ?? null;
    }
  };

  console.log('Tasks provider: memory');

} else if (provider === 'mongo') {
  //MongoDB
  const TASKS_URI =
    process.env.MONGODB_URI_TASKS ||
    process.env.MONGODB_URI ||
    AUTH_URI;

  mongoTasksConn = await mongoose.createConnection(TASKS_URI).asPromise();

  const taskSchema = new mongoose.Schema(
    {
      title:   { type: String, required: true, trim: true },
      userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      created_at: { type: Date, default: Date.now }
    },
    { versionKey: false }
  );
  taskSchema.index({ userId: 1, created_at: 1 });

  const TaskModel = mongoTasksConn.model('Task', taskSchema);

  repoTasks = {
    async list(userId) {
      const rows = await TaskModel
        .find({ userId })
        .sort({ created_at: 1 })
        .lean();
      return rows.map(r => ({
        title: r.title,
        created_at: new Date(r.created_at).toISOString().slice(0, 19).replace('T', ' ')
      }));
    },
    async create(userId, title) {
      const t = await TaskModel.create({ title, userId });
      return {
        title: t.title,
        created_at: new Date(t.created_at).toISOString().slice(0, 19).replace('T', ' ')
      };
    },
    async delete(userId, index1) {
      const i0 = Number(index1) - 1;
      const rows = await TaskModel
        .find({ userId })
        .sort({ created_at: 1 })
        .skip(i0)
        .limit(1);
      const doc = rows[0];
      if (!doc) return null;
      const title = doc.title;
      await TaskModel.deleteOne({ _id: doc._id, userId });
      return title;
    }
  };

  console.log('Tasks provider: mongo');

} else {
  // Postgres
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error('DATABASE_URL manquant pour Postgres (tasks)');
  }

  pgPool = new Pool({ connectionString: connStr });
  await pgPool.query('select 1');

  // Schéma tasks
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS tasks(
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at);`);

  const q = (text, params) => pgPool.query(text, params);

  repoTasks = {
    async list(userId) {
      const { rows } = await q(`
        SELECT title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM tasks
        WHERE user_id = $1
        ORDER BY created_at ASC
      `, [String(userId)]);
      return rows;
    },
    async create(userId, title) {
      const { rows } = await q(`
        INSERT INTO tasks(user_id, title)
        VALUES ($1, $2)
        RETURNING title, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at
      `, [String(userId), title]);
      return rows[0];
    },
    async delete(userId, index1) {
      const i0 = Number(index1) - 1;
      const idRes = await q(`
        SELECT id, title
        FROM tasks
        WHERE user_id = $1
        ORDER BY created_at ASC
        OFFSET $2 LIMIT 1
      `, [String(userId), i0]);
      const row = idRes.rows[0];
      if (!row) return null;
      await q(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [row.id, String(userId)]);
      return row.title;
    }
  };

  console.log('Tasks provider: postgres');
}

// Des fonctions auxiliaires pour les tests
export async function closeAuthDb() {
  if (mongoAuthConn && mongoAuthConn.readyState === 1) {
    await mongoAuthConn.close();
  }
}
export async function closeTasksDb() {
  if (provider === 'mongo' && mongoTasksConn && mongoTasksConn !== mongoAuthConn && mongoTasksConn.readyState === 1) {
    await mongoTasksConn.close();
  }
  if (provider === 'postgres' && pgPool) {
    await pgPool.end();
  }
}

export { repoTasks };
