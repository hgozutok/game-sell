import { Migration } from "@mikro-orm/migrations"

/**
 * Senkron basina magazaya listelenecek yeni urun sayisi.
 * 0 = sinirsiz (katalogda listelenmemis kalmayana kadar).
 */
export class Migration20261118090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "kinguin_settings" add column if not exists "sync_new_products_limit" integer not null default 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "kinguin_settings" drop column if exists "sync_new_products_limit";`)
  }
}
