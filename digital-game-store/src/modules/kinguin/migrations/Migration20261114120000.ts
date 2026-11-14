import { Migration } from "@mikro-orm/migrations"

/**
 * ESA guide §8: Kinguin siparis durumlarina "refunded" eklendi
 * (key'ler iade edildiginde siparis refunded olur).
 */
export class Migration20261114120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "kinguin_order" drop constraint "kinguin_order_status_check";`
    )
    this.addSql(
      `alter table "kinguin_order" add constraint "kinguin_order_status_check" check ("status" in ('pending', 'processing', 'completed', 'canceled', 'failed', 'refunded'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "kinguin_order" drop constraint "kinguin_order_status_check";`
    )
    this.addSql(
      `alter table "kinguin_order" add constraint "kinguin_order_status_check" check ("status" in ('pending', 'processing', 'completed', 'canceled', 'failed'));`
    )
  }
}
