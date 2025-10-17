import pg from "pg";
const { Pool } = pg;

export const connect = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params) {
  const res = await connect.query(text, params);
  return res;
}
