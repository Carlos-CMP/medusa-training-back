import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260820120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table if exists "company" add column if not exists "role_spending_limits" jsonb null;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "company" drop column if exists "role_spending_limits";'
    );
  }
}
