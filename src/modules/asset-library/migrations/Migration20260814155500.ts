import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260814155500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "asset" add column if not exists "filename" text null;`);
    this.addSql(`alter table if exists "asset" add column if not exists "mime_type" text null;`);
    this.addSql(`alter table if exists "asset" add column if not exists "content_base64" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "asset" drop column if exists "content_base64";`);
    this.addSql(`alter table if exists "asset" drop column if exists "mime_type";`);
    this.addSql(`alter table if exists "asset" drop column if exists "filename";`);
  }
}
