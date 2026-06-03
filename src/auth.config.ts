import type { NextAuthConfig } from "next-auth";

export const PUBLIC_PATHS = ["/login", "/api/auth"];

export default {
  providers: [],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { username?: string }).username = token.username as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
