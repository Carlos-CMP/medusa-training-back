import { model } from "@medusajs/framework/utils";

export const CatalogRule = model.define("catalog_rule", {
  id: model
    .id({
      prefix: "crule",
    })
    .primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  status: model.enum(["draft", "active", "archived"]).default("draft"),
  priority: model.number().default(100),
  rule_type: model
    .enum(["price", "visibility", "assortment", "quote"])
    .default("price"),
  target_type: model
    .enum(["all", "product", "variant", "category", "collection"])
    .default("all"),
  target_id: model.text().nullable(),
  company_id: model.text().nullable(),
  customer_group_id: model.text().nullable(),
  region_id: model.text().nullable(),
  sales_channel_id: model.text().nullable(),
  zone_code: model.text().nullable(),
  currency_code: model.text().nullable(),
  effect_type: model
    .enum([
      "discount_percentage",
      "fixed_price",
      "hide",
      "show_only",
      "requires_quote",
    ])
    .default("discount_percentage"),
  discount_percentage: model.float().nullable(),
  fixed_price: model.float().nullable(),
  minimum_quantity: model.number().default(1),
  starts_at: model.text().nullable(),
  ends_at: model.text().nullable(),
  metadata: model.json().nullable(),
});
