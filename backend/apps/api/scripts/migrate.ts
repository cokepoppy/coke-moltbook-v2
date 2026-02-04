import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { env } from "../src/env.js";

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(";") ? s : `${s};`));
}

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
    charset: "utf8mb4"
  });

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE KEY uk_schema_migrations_filename (filename)
      ) ENGINE=InnoDB;
    `);

    const [rows] = (await conn.query("SELECT filename FROM schema_migrations")) as unknown as [
      { filename: string }[],
      unknown
    ];
    const applied = new Set(rows.map((r) => r.filename));

    for (const filename of files) {
      if (applied.has(filename)) continue;
      const full = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(full, "utf8");
      const statements = splitSqlStatements(sql);
      await conn.beginTransaction();
      try {
        for (const stmt of statements) {
          await conn.execute(stmt);
        }
        await conn.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
        await conn.commit();
        // eslint-disable-next-line no-console
        console.log(`applied ${filename}`);
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
