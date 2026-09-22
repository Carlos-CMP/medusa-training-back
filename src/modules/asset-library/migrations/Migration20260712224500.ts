import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712224500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "asset" ("id" text not null, "label" text not null, "url" text not null, "alt" text null, "type" text check ("type" in ('logo', 'hero', 'homepage', 'product', 'category', 'document', 'other')) not null default 'homepage', "client_profile_id" text not null default 'ngs', "tags" text null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "asset_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_asset_client_profile_id" ON "asset" ("client_profile_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_asset_type" ON "asset" ("type") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_asset_deleted_at" ON "asset" ("deleted_at") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "asset" cascade;`);
  }
}
