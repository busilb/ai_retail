"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, type Role } from "@/lib/role";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "经营看板", group: "dashboard" },
  { href: "/supply", label: "货盘补货", group: "supply" },
  { href: "/campaign", label: "活动报名", group: "campaign" },
  { href: "/pricing", label: "竞对跟价", group: "pricing" },
];

export function TopNav({
  user,
}: {
  user: { name: string; username: string; role: Role };
}) {
  const doLogout = () => signOut({ callbackUrl: "/login" });
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const dashHref = `/dashboard/${user.role}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4 lg:px-6">
        {/* Logo */}
        <Link href={dashHref} className="flex items-center gap-2 mr-6">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-orange-500 to-pink-500" />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-none">金售经营智能体</div>
            <div className="text-[10px] text-slate-500 mt-0.5">近场零售 AI 决策套件</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map((item) => {
            const href = item.group === "dashboard" ? dashHref : item.href;
            return (
              <Link
                key={item.group}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive(href)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User dropdown */}
        <div className="ml-auto hidden md:flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">演示数据</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 h-8 rounded-md px-2 hover:bg-slate-100 transition-colors data-[popup-open]:bg-slate-100"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs flex items-center justify-center font-medium">
                {user.name.slice(0, 1)}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-medium">{user.name}</div>
                <div className="text-[10px] text-slate-500">{ROLE_LABEL[user.role]}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{user.username}@jinshou.ai</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doLogout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile menu trigger */}
        <button
          className="ml-auto md:hidden p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="切换菜单"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => {
              const href = item.group === "dashboard" ? dashHref : item.href;
              return (
                <Link
                  key={item.group}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm",
                    isActive(href)
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 pt-3 border-t flex items-center justify-between">
              <div className="text-xs">
                <div className="font-medium">{user.name}</div>
                <div className="text-slate-500">{ROLE_LABEL[user.role]}</div>
              </div>
              <Button onClick={doLogout} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-1" /> 退出
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
