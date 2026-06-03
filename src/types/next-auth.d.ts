import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: "boss" | "director" | "manager" | "staff";
      username: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: "boss" | "director" | "manager" | "staff";
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "boss" | "director" | "manager" | "staff";
    username?: string;
  }
}
