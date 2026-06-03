import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import authConfig from "./auth.config";

export type Role = "boss" | "director" | "manager" | "staff";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(creds) {
        const username = String(creds?.username || "").trim();
        const password = String(creds?.password || "");
        if (!username || !password) return null;
        const row = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        if (!row) return null;
        const ok = bcrypt.compareSync(password, row.passwordHash);
        if (!ok) return null;
        return {
          id: row.id,
          name: row.name,
          email: `${row.username}@jinshou.ai`,
          role: row.role as Role,
          username: row.username,
        };
      },
    }),
  ],
});
