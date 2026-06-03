import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "node:path";

/**
 * 双模式 DB client：
 * - 本地开发：file:./data/jinshou.db (默认)
 * - 部署 Turso：libsql://xxx.turso.io + auth token
 * 切换标准：是否设置了 TURSO_DATABASE_URL
 */
function buildUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const localPath = process.env.DB_PATH || path.join(process.cwd(), "data", "jinshou.db");
  return `file:${localPath}`;
}

const url = buildUrl();
const authToken = process.env.TURSO_AUTH_TOKEN;

const sqlite = createClient({ url, ...(authToken ? { authToken } : {}) });

export const db = drizzle(sqlite, { schema });
export { schema };
