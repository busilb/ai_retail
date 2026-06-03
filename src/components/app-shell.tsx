import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TopNav } from "./top-nav";
import type { Role } from "@/lib/role";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav
        user={{
          name: session.user.name || session.user.username,
          username: session.user.username,
          role: session.user.role as Role,
        }}
      />
      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-4 lg:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
