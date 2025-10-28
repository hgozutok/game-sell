import { Migration } from '@mikro-orm/migrations';

export class Migration20251028100037 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "digital_key" ("id" text not null, "key_code" text not null, "product_id" text not null, "variant_id" text null, "provider" text check ("provider" in ('codesWholesale', 'kinguin', 'manual')) not null default 'manual', "sku" text null, "status" text check ("status" in ('available', 'assigned', 'delivered', 'revoked')) not null default 'available', "order_id" text null, "customer_id" text null, "assigned_at" timestamptz null, "delivered_at" timestamptz null, "revoked_at" timestamptz null, "platform" text null, "region" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "digital_key_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_digital_key_deleted_at" ON "digital_key" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "digital_key" cascade;`);
  }

}
