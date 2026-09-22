import { Migration } from "@mikro-orm/migrations";

export class Migration20260712191000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "brand_profile_config" ("id" text not null, "key" text not null, "content" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_profile_config_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_profile_config_deleted_at" ON "brand_profile_config" ("deleted_at") WHERE deleted_at IS NULL;`
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "brand_profile_config" cascade;`);
  }
}
