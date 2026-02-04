import mysql from "mysql2/promise";
import { env } from "./env.js";

export const db = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: "utf8mb4"
});

export type SqlParams = unknown[] | Record<string, unknown>;

export async function queryRows<T>(sql: string, params?: SqlParams): Promise<T[]> {
  const [rows] = await db.query(sql, params as any);
  return rows as T[];
}

export async function queryRowsConn<T>(conn: mysql.PoolConnection, sql: string, params?: SqlParams): Promise<T[]> {
  const [rows] = await conn.query(sql, params as any);
  return rows as T[];
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
