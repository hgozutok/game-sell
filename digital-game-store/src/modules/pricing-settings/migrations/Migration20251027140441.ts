import { Migration } from '@mikro-orm/migrations';

export class Migration20251027140441 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pricing_rule" ("id" text not null, "category_id" text null, "category_name" text not null, "provider" text not null, "margin_percentage" integer not null, "min_price" integer null, "max_price" integer null, "is_active" boolean not null default true, "priority" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pricing_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pricing_rule_deleted_at" ON "pricing_rule" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pricing_rule" cascade;`);
  }

}
