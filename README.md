# 近场零售经营智能体（MVP）

> 给即时零售 / 近场零售总部的「运营 + 供应链双角色」AI 提效平台。
> 对标松鼠便利 / 快送熊。4 场景 · 4 角色 · LLM 决策 · 移动友好。

## 4 个场景

| 场景 | 入口 | 核心价值 |
|---|---|---|
| 🛒 **货盘补货** | `/supply` | 价格带×品类 缺口热力图（vs 松鼠 / 快送熊）+ AI 补货建议表（含进货价 / 售价 / 月销 / GMV 增量 / Top3 理由 / 置信度）+ 一键复制采购单 |
| 🎯 **多平台活动报名** | `/campaign` | 美团 / 饿了么 / 抖音 / 京东到家 活动聚合 + AI 0-100 打分 + 报名 / 缓报 / 不报 三态决策 + 一键推送企微 |
| 💰 **竞对跟价** | `/pricing` | 同 SPU 价差自动监控 + 阈值报警 + AI 跟价 / 守住 / 差异化 决策 + 建议价 |
| 📊 **角色化 BI** | `/dashboard/{role}` | 4 角色（老板 / 总监 / 店长 / 运营）独立看板 · 老板看大盘 + AI 摘要 + 待办，总监看品类 ROI，店长看本店 vs 商圈，运营看待办 |

## 4 个测试账号

统一密码 `demo2026`：

| 用户名 | 姓名 | 角色 |
|---|---|---|
| `boss` | 李总 | 老板（全局视角） |
| `director` | 王总监 | 品类总监 |
| `manager` | 张店长 | 单店店长 |
| `staff` | 小赵 | 运营 |

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router) + React 19 |
| UI | Tailwind 4 + shadcn/ui + ECharts 6 |
| 数据 | Drizzle ORM + SQLite (better-sqlite3) |
| 认证 | NextAuth v5 (JWT + Credentials) |
| LLM | Anthropic Claude SDK + 内置规则引擎 fallback |
| 表格 | SheetJS (xlsx) |

## 启动（开发环境）

```bash
# 1. 装依赖
npm install

# 2. 准备 env
cat > .env.local <<EOF
AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
DB_PATH=./data/jinshou.db
# 可选：填了走真 Claude，不填走规则引擎 mock（演示效果一样）
# ANTHROPIC_API_KEY=sk-ant-...
EOF

# 3. 建库 + 灌种子
mkdir -p data
npx drizzle-kit push --force
npx tsx scripts/seed-demo-data.ts

# 4. 起服务
npm run dev
# → http://localhost:3000
```

## 项目结构

```
src/
├── app/
│   ├── (app)/                     # 登录后的业务路由 (含 AppShell)
│   │   ├── dashboard/[role]/      # 4 角色看板
│   │   ├── supply/                # 货盘对比 + AI 补货
│   │   ├── campaign/              # 多平台活动 + AI 报名
│   │   └── pricing/               # 竞对跟价 + AI 价盘
│   ├── api/auth/[...nextauth]/    # NextAuth handlers
│   └── login/                     # 登录页
├── auth.ts                         # NextAuth 主配置（含 DB）
├── auth.config.ts                  # Edge-safe 子集（middleware 用）
├── middleware.ts                   # 路由守卫
├── db/
│   ├── schema.ts                  # Drizzle schema (8 张表)
│   └── client.ts                  # SQLite client
├── lib/
│   ├── llm.ts                     # Claude + mock 抽象层 (4 高层函数)
│   ├── metrics.ts                 # BI 指标查询
│   ├── supply.ts                  # 货盘缺口分析
│   └── role.ts                    # 角色定义
└── components/
    ├── ui/                        # shadcn 基础组件
    ├── chart.tsx                  # ECharts 按需引入封装
    ├── kpi-card.tsx               # KPI 数字卡（带 WoW 同期对比）
    ├── trend-chart.tsx            # 30 天 GMV 折线 + 异常标记
    ├── price-band-heatmap.tsx     # 价格带×品类 缺口热力图
    ├── restock-table.tsx          # AI 补货建议表（可勾选 + 复制）
    ├── ai-briefing.tsx            # AI 经营摘要卡 + 待办
    ├── push-button.tsx            # 推送到企微（演示用 toast）
    ├── top-nav.tsx                # 顶部导航（含角色切换）
    └── app-shell.tsx              # 业务页布局壳

scripts/
└── seed-demo-data.ts              # 185 自家 + 426 竞品 SKU + 30 天经营数据
```

## LLM 抽象层（`src/lib/llm.ts`）

4 个高层函数 · 全部支持 Claude / mock 双模式：

```ts
generateBriefing(metrics) → { headline, paragraphs[3], todos[5] }
generateRestock(gapSpus, topN) → RestockSuggestion[]
scoreCampaign(campaign) → { score: 0-100, action: 报名|缓报|不报, reason }
recommendPricing(skuVsCompetitor) → { action: 跟价|守住|差异化, suggestedPrice?, reason }
```

设置 `ANTHROPIC_API_KEY` 即切到 Claude · 留空走规则引擎 mock（合理的业务规则，不是随机数）。

## 已知边界

- 数据库是 SQLite 本地文件，**部署到 serverless 平台**需切换 Turso / Cloudflare D1 / Postgres
- 中间件用了 `middleware.ts` 名字，Next 16 已 deprecated 推荐改 `proxy.ts`（暂不影响）
- 竞品 SKU 数据来自 `scripts/seed-demo-data.ts` 中手工列出的 SPU 库 + 程序化采样，演示用；生产对接需替换为真实 Apify / 八爪鱼采集 JSON
- 「自动报名」功能限定为「决策助手 + 清单导出」，不含真实跨平台代点击（合规边界）

## 三档商务报价（提案中）

| 档位 | 价格 | 内容 |
|---|---|---|
| 试水档 | ¥1.8 万 | 活动报名提效，5 账号，1 个月 |
| 核心档 | ¥4.8 万 | 活动 + 补货 + 日报，20 账号，3 次培训 |
| 全家桶 | ¥8.8 万 | 4 场景全包 + 4 层角色 + 1 年维护 + 季度复盘 |

---

私有项目 · 仅供内部 / 客户演示
