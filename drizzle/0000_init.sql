CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`signup_start` integer NOT NULL,
	`signup_end` integer NOT NULL,
	`event_start` integer NOT NULL,
	`event_end` integer NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` real NOT NULL,
	`budget_limit` real,
	`status` text DEFAULT 'draft',
	`ai_recommendation` text,
	`ai_score` real
);
--> statement-breakpoint
CREATE TABLE `competitor_skus` (
	`id` text PRIMARY KEY NOT NULL,
	`competitor_id` text NOT NULL,
	`spu_id` text,
	`name` text NOT NULL,
	`brand` text,
	`category` text NOT NULL,
	`subcategory` text,
	`spec` text,
	`price` real NOT NULL,
	`monthly_sales` integer,
	`collected_at` integer DEFAULT (unixepoch()),
	`source` text DEFAULT 'apify_demo',
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`region` text
);
--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`store_id` text NOT NULL,
	`date` text NOT NULL,
	`gmv` real NOT NULL,
	`order_cnt` integer NOT NULL,
	`uv` integer NOT NULL,
	`pv` integer NOT NULL,
	`cvr` real NOT NULL,
	`aov` real NOT NULL,
	`refund_rate` real NOT NULL,
	`rider_min` real,
	`repurchase_rate_30d` real,
	PRIMARY KEY(`store_id`, `date`),
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `restock_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`price_band` text NOT NULL,
	`competitor_spu_id` text,
	`competitor_name` text,
	`suggested_name` text NOT NULL,
	`suggested_brand` text,
	`suggested_spec` text,
	`suggested_cost_min` real,
	`suggested_cost_max` real,
	`suggested_price` real NOT NULL,
	`expected_monthly_sales` integer,
	`expected_gmv_lift` real,
	`reason` text NOT NULL,
	`confidence` text DEFAULT 'medium',
	`generated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `skus` (
	`id` text PRIMARY KEY NOT NULL,
	`spu_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category` text NOT NULL,
	`subcategory` text,
	`spec` text,
	`cost` real NOT NULL,
	`price` real NOT NULL,
	`stock` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`source` text DEFAULT 'self'
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`district` text NOT NULL,
	`biz_circle` text NOT NULL,
	`opened_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);