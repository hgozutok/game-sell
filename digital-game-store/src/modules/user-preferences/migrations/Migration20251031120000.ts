import { Migration } from '@mikro-orm/migrations';

export class Migration20251031120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "user_preference" ("id" text not null, "user_id" text null, "key" text not null, "value" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "user_preference_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_preference_user_id" ON "user_preference" (user_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_preference_key" ON "user_preference" (key);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_preference_deleted_at" ON "user_preference" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "user_preference" cascade;`);
  }

}

