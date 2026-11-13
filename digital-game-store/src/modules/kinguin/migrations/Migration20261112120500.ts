import { Migration } from '@mikro-orm/migrations';

// El yazimi incremental: kinguin_product'a onay alanlari, kinguin_settings'e
// sync_interval_minutes + last_sync_at ekler.
export class Migration20261112120500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "kinguin_product" add column if not exists "pending_price" integer null, add column if not exists "pending_cost" integer null;`);
    this.addSql(`alter table if exists "kinguin_settings" add column if not exists "sync_interval_minutes" integer not null default 360, add column if not exists "last_sync_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "kinguin_product" drop column if exists "pending_price", drop column if exists "pending_cost";`);
    this.addSql(`alter table if exists "kinguin_settings" drop column if exists "sync_interval_minutes", drop column if exists "last_sync_at";`);
  }

}
