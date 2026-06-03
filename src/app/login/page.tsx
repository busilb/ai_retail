import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEMO_ACCOUNTS = [
  { username: "boss",     name: "李总（老板）",   role: "boss",     desc: "全局视角：利润 / GMV / 异常预警 / 竞对动向" },
  { username: "director", name: "王总监",          role: "director", desc: "品类视角：品类 ROI / 补货建议汇总 / 跨店对比" },
  { username: "manager",  name: "张店长",          role: "manager",  desc: "门店视角：单店运营 / 活动报名进度 / 履约" },
  { username: "staff",    name: "小赵（运营）",   role: "staff",    desc: "执行视角：今日待办 / 报名清单 / 补货执行" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) redirect(sp.from || `/dashboard/${session.user.role}`);

  async function doLogin(formData: FormData) {
    "use server";
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const from = String(formData.get("from") || "");
    try {
      await signIn("credentials", {
        username,
        password,
        redirect: true,
        redirectTo: from || "/dashboard",
      });
    } catch (err) {
      // NextAuth v5 throws a special redirect error on success; rethrow it
      if ((err as Error).message?.includes("NEXT_REDIRECT")) throw err;
      const url = new URL("/login", "http://localhost");
      url.searchParams.set("error", "invalid_credentials");
      if (from) url.searchParams.set("from", from);
      redirect(`${url.pathname}?${url.searchParams.toString()}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        {/* Left: 登录表单 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">金售经营智能体</CardTitle>
            <CardDescription>近场零售 · 角色化 BI · 补货建议 · 多平台活动决策</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={doLogin} className="space-y-4">
              <input type="hidden" name="from" value={sp.from || ""} />
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" name="username" placeholder="boss / director / manager / staff" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" name="password" type="password" placeholder="demo2026" autoComplete="current-password" required />
              </div>
              {sp.error && (
                <p className="text-sm text-red-600">用户名或密码错误，请检查后重试。</p>
              )}
              <Button type="submit" className="w-full">登录</Button>
            </form>
            <p className="text-xs text-slate-500 mt-6 text-center">
              演示账号见右侧；统一密码 <code className="px-1 py-0.5 bg-slate-200 rounded">demo2026</code>
            </p>
          </CardContent>
        </Card>

        {/* Right: 演示账号说明卡 */}
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-lg">4 个演示角色</CardTitle>
            <CardDescription>不同角色看到不同看板与数据切片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.username} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50">
                <Badge variant="secondary" className="shrink-0 mt-0.5">{a.username}</Badge>
                <div className="space-y-1">
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-slate-600">{a.desc}</div>
                </div>
              </div>
            ))}
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mt-4">
              ⚠ 此为内部演示环境，所有数据均为示例/脱敏。商家真实经营数据请勿上传。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
