import type { Config } from "drizzle-kit";
import path from "node:path";

const isRemote = !!process.env.TURSO_DATABASE_URL;

const url = isRemote
  ? process.env.TURSO_DATABASE_URL!
  : `file:${process.env.DB_PATH || path.join(process.cwd(), "data", "jinshou.db")}`;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    ...(isRemote && process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN }
      : {}),
  },
} satisfies Config;
