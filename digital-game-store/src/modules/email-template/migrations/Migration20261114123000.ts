import { Migration } from "@mikro-orm/migrations"

/**
 * E-posta sablonlarinda varsayilan dil Ingilizce oldu.
 * Dili tespit edilemeyen alicilara Ingilizce gonderilir.
 */
export class Migration20261114123000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "email_template" alter column "locale" set default 'en';`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "email_template" alter column "locale" set default 'tr';`)
  }
}
