import { Migration } from '@mikro-orm/migrations';

export class Migration20261113100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "audit_log" ("id" text not null, "action" text not null, "entity" text not null, "entity_id" text null, "diff" jsonb null, "actor_id" text null, "actor_email" text null, "ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_entity_id" ON "audit_log" (entity, entity_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_created_at" ON "audit_log" (created_at);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_deleted_at" ON "audit_log" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);
  }
}
