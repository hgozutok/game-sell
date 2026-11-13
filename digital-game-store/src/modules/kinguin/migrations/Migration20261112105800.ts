import { Migration } from '@mikro-orm/migrations';

export class Migration20261112105800 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "kinguin_product" drop constraint if exists "kinguin_product_kinguin_id_unique";`);
    this.addSql(`alter table if exists "kinguin_order" drop constraint if exists "kinguin_order_medusa_order_id_unique";`);
    this.addSql(`alter table if exists "kinguin_order" drop constraint if exists "kinguin_order_order_id_unique";`);
    this.addSql(`create table if not exists "kinguin_order" ("id" text not null, "order_id" text not null, "external_id" text null, "status" text check ("status" in ('pending', 'processing', 'completed', 'canceled', 'failed')) not null default 'pending', "total_price" integer not null default 0, "currency" text not null default 'eur', "products" jsonb null, "keys_encrypted" jsonb null, "keys_delivered_at" timestamptz null, "medusa_order_id" text null, "idempotency_key" text null, "error" text null, "retries" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kinguin_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_kinguin_order_order_id_unique" ON "kinguin_order" (order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_kinguin_order_medusa_order_id_unique" ON "kinguin_order" (medusa_order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kinguin_order_deleted_at" ON "kinguin_order" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "kinguin_product" ("id" text not null, "kinguin_id" text not null, "product_id" text null, "name" text not null, "original_name" text null, "platform" text null, "genre" text null, "region_id" integer null, "region_limitations" text null, "qty" integer not null default 0, "text_qty" integer not null default 0, "price" integer not null default 0, "currency" text not null default 'eur', "images" jsonb null, "description" text null, "system_requirements" jsonb null, "release_date" timestamptz null, "age_rating" integer null, "genres" jsonb null, "tags" jsonb null, "is_preorder" boolean not null default false, "has_text" boolean not null default true, "store_listed" boolean not null default false, "medusa_product_id" text null, "medusa_variant_id" text null, "last_synced_at" timestamptz null, "raw_payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kinguin_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_kinguin_product_kinguin_id_unique" ON "kinguin_product" (kinguin_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kinguin_product_deleted_at" ON "kinguin_product" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "kinguin_settings" ("id" text not null, "auto_fulfill_enabled" boolean not null default true, "order_mode" text check ("order_mode" in ('readonly', 'live')) not null default 'readonly', "min_balance" integer not null default 10, "stop_on_negative_margin" boolean not null default true, "sync_cron" text not null default '0 */6 * * *', "sync_prices" boolean not null default true, "sync_stock" boolean not null default true, "sync_info" boolean not null default false, "sync_new_products" boolean not null default false, "hide_on_zero_stock" boolean not null default true, "auto_reprice" boolean not null default true, "max_price_change_pct" integer not null default 30, "default_margin_pct" integer not null default 15, "min_profit_pct" integer not null default 0, "rounding_rule" text check ("rounding_rule" in ('none', 'ninety_nine')) not null default 'ninety_nine', "provider_currency" text not null default 'eur', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kinguin_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kinguin_settings_deleted_at" ON "kinguin_settings" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "sync_log" ("id" text not null, "type" text check ("type" in ('full', 'price', 'stock', 'import', 'order_status')) not null default 'full', "source" text not null default 'kinguin', "status" text check ("status" in ('running', 'completed', 'failed')) not null default 'running', "items_total" integer not null default 0, "items_added" integer not null default 0, "items_updated" integer not null default 0, "items_failed" integer not null default 0, "pending_approvals" integer not null default 0, "errors" jsonb null, "details" jsonb null, "started_at" timestamptz null, "finished_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sync_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sync_log_deleted_at" ON "sync_log" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "kinguin_order" cascade;`);

    this.addSql(`drop table if exists "kinguin_product" cascade;`);

    this.addSql(`drop table if exists "kinguin_settings" cascade;`);

    this.addSql(`drop table if exists "sync_log" cascade;`);
  }

}
