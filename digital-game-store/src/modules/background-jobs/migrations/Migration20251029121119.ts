import { Migration } from '@mikro-orm/migrations';

export class Migration20251029121119 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "background_job" ("id" text not null, "type" text not null, "status" text check ("status" in ('pending', 'running', 'completed', 'failed')) not null default 'pending', "progress" integer not null default 0, "total_items" integer not null default 0, "processed_items" integer not null default 0, "result" jsonb null, "error" text null, "metadata" jsonb null, "completed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "background_job_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_background_job_deleted_at" ON "background_job" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "background_job" cascade;`);
  }

}
