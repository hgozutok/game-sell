import { Migration } from "@mikro-orm/migrations"

/**
 * Sync log: iptal durumu + canli ilerleme/heartbeat alanlari.
 * "stalled" ayri bir DB durumu degildir; heartbeat'i eskimis running kayitlar
 * API tarafinda takili olarak isaretlenir ve admin tarafindan iptal edilebilir.
 */
export class Migration20261114130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "sync_log" drop constraint if exists "sync_log_status_check";`)
    this.addSql(
      `alter table if exists "sync_log" add constraint "sync_log_status_check" check ("status" in ('running', 'completed', 'failed', 'canceled'));`
    )
    this.addSql(`alter table if exists "sync_log" add column if not exists "progress_total" integer not null default 0;`)
    this.addSql(`alter table if exists "sync_log" add column if not exists "progress_processed" integer not null default 0;`)
    this.addSql(`alter table if exists "sync_log" add column if not exists "heartbeat_at" timestamptz null;`)
    this.addSql(`alter table if exists "sync_log" add column if not exists "canceled_at" timestamptz null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "sync_log" drop constraint if exists "sync_log_status_check";`)
    this.addSql(
      `alter table if exists "sync_log" add constraint "sync_log_status_check" check ("status" in ('running', 'completed', 'failed'));`
    )
    this.addSql(`alter table if exists "sync_log" drop column if exists "progress_total";`)
    this.addSql(`alter table if exists "sync_log" drop column if exists "progress_processed";`)
    this.addSql(`alter table if exists "sync_log" drop column if exists "heartbeat_at";`)
    this.addSql(`alter table if exists "sync_log" drop column if exists "canceled_at";`)
  }
}
