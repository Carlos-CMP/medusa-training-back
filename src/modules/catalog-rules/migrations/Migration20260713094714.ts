import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713094714 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "catalog_rule" ("id" text not null, "name" text not null, "description" text null, "status" text check ("status" in ('draft', 'active', 'archived')) not null default 'draft', "priority" integer not null default 100, "rule_type" text check ("rule_type" in ('price', 'visibility', 'assortment', 'quote')) not null default 'price', "target_type" text check ("target_type" in ('all', 'product', 'variant', 'category', 'collection')) not null default 'all', "target_id" text null, "company_id" text null, "customer_group_id" text null, "region_id" text null, "sales_channel_id" text null, "zone_code" text null, "currency_code" text null, "effect_type" text check ("effect_type" in ('discount_percentage', 'fixed_price', 'hide', 'show_only', 'requires_quote')) not null default 'discount_percentage', "discount_percentage" double precision null, "fixed_price" double precision null, "minimum_quantity" integer not null default 1, "starts_at" text null, "ends_at" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "catalog_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_status_priority" ON "catalog_rule" ("status", "priority") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_target" ON "catalog_rule" ("target_type", "target_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_company" ON "catalog_rule" ("company_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_customer_group" ON "catalog_rule" ("customer_group_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_region_channel" ON "catalog_rule" ("region_id", "sales_channel_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_rule_deleted_at" ON "catalog_rule" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog_rule" cascade;`);
  }

}
