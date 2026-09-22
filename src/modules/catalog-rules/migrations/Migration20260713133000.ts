import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713133000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "catalog_rule" alter column "discount_percentage" type double precision using "discount_percentage"::double precision;`
    );
    this.addSql(
      `alter table if exists "catalog_rule" alter column "fixed_price" type double precision using "fixed_price"::double precision;`
    );
    this.addSql(
      `do $$
      begin
        if exists (
          select 1
          from information_schema.columns
          where table_name = 'catalog_rule'
            and column_name = 'metadata'
            and udt_name <> 'jsonb'
        ) then
          alter table if exists "catalog_rule"
            alter column "metadata" type jsonb
            using case
              when "metadata" is null or btrim("metadata"::text) = '' then null
              else "metadata"::jsonb
            end;
        end if;
      end $$;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "catalog_rule" alter column "metadata" type text using "metadata"::text;`
    );
    this.addSql(
      `alter table if exists "catalog_rule" alter column "fixed_price" type integer using round("fixed_price")::integer;`
    );
    this.addSql(
      `alter table if exists "catalog_rule" alter column "discount_percentage" type integer using round("discount_percentage")::integer;`
    );
  }
}
