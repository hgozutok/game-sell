import { Migration } from "@mikro-orm/migrations"

export class Migration20261113140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "email_template" add column if not exists "locale" text not null default 'tr';`)
    this.addSql(`drop index if exists "IDX_email_template_key_unique";`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_template_key_locale_unique" ON "email_template" ("key", "locale") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_email_template_key_locale_unique";`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_template_key_unique" ON "email_template" ("key") WHERE deleted_at IS NULL;`)
    this.addSql(`alter table "email_template" drop column if exists "locale";`)
  }
}
