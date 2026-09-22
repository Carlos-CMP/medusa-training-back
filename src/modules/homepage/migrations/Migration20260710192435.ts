import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260710192435 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "homepage_config" ("id" text not null, "key" text not null, "content" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_homepage_config_deleted_at" ON "homepage_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "homepage_config" cascade;`);
  }

}
