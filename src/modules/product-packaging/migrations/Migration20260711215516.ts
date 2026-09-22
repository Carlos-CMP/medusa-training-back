import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260711215516 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_packaging" drop constraint if exists "product_packaging_variant_id_unique";`);
    this.addSql(`create table if not exists "product_packaging" ("id" text not null, "variant_id" text not null, "sales_unit" text check ("sales_unit" in ('unit', 'box')) not null default 'unit', "minimum_order_quantity" integer not null default 1, "quantity_increment" integer not null default 1, "units_per_box" integer not null default 1, "boxes_per_pallet" integer null, "package_weight" integer null, "package_dimensions" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_packaging_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_packaging_variant_id_unique" ON "product_packaging" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_packaging_deleted_at" ON "product_packaging" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_packaging" cascade;`);
  }

}
