import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["boss", "director", "manager", "staff"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  bizCircle: text("biz_circle").notNull(),
  openedAt: text("opened_at"),
});

export const skus = sqliteTable("skus", {
  id: text("id").primaryKey(),
  spuId: text("spu_id").notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  spec: text("spec"),
  cost: real("cost").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").default(0),
  status: text("status", { enum: ["active", "out_of_stock", "delisted"] }).default("active"),
  source: text("source", { enum: ["self", "mock", "uploaded"] }).default("self"),
});

export const competitors = sqliteTable("competitors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  region: text("region"),
});

export const competitorSkus = sqliteTable("competitor_skus", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id").notNull().references(() => competitors.id),
  spuId: text("spu_id"),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  spec: text("spec"),
  price: real("price").notNull(),
  monthlySales: integer("monthly_sales"),
  collectedAt: integer("collected_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  source: text("source").default("apify_demo"),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  platform: text("platform", { enum: ["meituan", "eleme", "douyin", "jd"] }).notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  signupStart: integer("signup_start", { mode: "timestamp" }).notNull(),
  signupEnd: integer("signup_end", { mode: "timestamp" }).notNull(),
  eventStart: integer("event_start", { mode: "timestamp" }).notNull(),
  eventEnd: integer("event_end", { mode: "timestamp" }).notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: real("discount_value").notNull(),
  budgetLimit: real("budget_limit"),
  status: text("status", { enum: ["draft", "pending", "approved", "rejected", "running", "ended"] }).default("draft"),
  aiRecommendation: text("ai_recommendation"),
  aiScore: real("ai_score"),
});

export const dailyMetrics = sqliteTable(
  "daily_metrics",
  {
    storeId: text("store_id").notNull().references(() => stores.id),
    date: text("date").notNull(),
    gmv: real("gmv").notNull(),
    orderCnt: integer("order_cnt").notNull(),
    uv: integer("uv").notNull(),
    pv: integer("pv").notNull(),
    cvr: real("cvr").notNull(),
    aov: real("aov").notNull(),
    refundRate: real("refund_rate").notNull(),
    riderMin: real("rider_min"),
    repurchaseRate30d: real("repurchase_rate_30d"),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.date] })]
);

export const restockSuggestions = sqliteTable("restock_suggestions", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  priceBand: text("price_band").notNull(),
  competitorSpuId: text("competitor_spu_id"),
  competitorName: text("competitor_name"),
  suggestedName: text("suggested_name").notNull(),
  suggestedBrand: text("suggested_brand"),
  suggestedSpec: text("suggested_spec"),
  suggestedCostMin: real("suggested_cost_min"),
  suggestedCostMax: real("suggested_cost_max"),
  suggestedPrice: real("suggested_price").notNull(),
  expectedMonthlySales: integer("expected_monthly_sales"),
  expectedGmvLift: real("expected_gmv_lift"),
  reason: text("reason").notNull(),
  confidence: text("confidence", { enum: ["high", "medium", "low"] }).default("medium"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Sku = typeof skus.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type CompetitorSku = typeof competitorSkus.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type RestockSuggestion = typeof restockSuggestions.$inferSelect;
