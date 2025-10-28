import { Migration } from '@mikro-orm/migrations';

export class Migration20251027140302 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "slider_item" ("id" text not null, "title" text not null, "subtitle" text null, "image_url" text not null, "link_url" text not null, "button_text" text not null default 'Learn More', "order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "slider_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_slider_item_deleted_at" ON "slider_item" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "slider_item" cascade;`);
  }

}
