import { Migration } from "@mikro-orm/migrations"

/**
 * E-posta şablonlarının başlığındaki Türkçe "DİJİTAL OYUN MAĞAZASI" etiketini
 * tüm dillerde İngilizce "DIGITAL GAME STORE" olarak günceller.
 */
export class Migration20261113150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `update "email_template" set "html" = replace("html", 'DİJİTAL OYUN MAĞAZASI', 'DIGITAL GAME STORE') where "html" like '%DİJİTAL OYUN MAĞAZASI%';`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `update "email_template" set "html" = replace("html", 'DIGITAL GAME STORE', 'DİJİTAL OYUN MAĞAZASI') where "html" like '%DIGITAL GAME STORE%';`
    )
  }
}
