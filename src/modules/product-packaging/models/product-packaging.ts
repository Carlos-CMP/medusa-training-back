import { model } from "@medusajs/framework/utils";

export const ProductPackaging = model.define("product_packaging", {
  id: model
    .id({
      prefix: "pkg",
    })
    .primaryKey(),
  variant_id: model.text().unique(),
  sales_unit: model.enum(["unit", "box"]).default("unit"),
  minimum_order_quantity: model.number().default(1),
  quantity_increment: model.number().default(1),
  units_per_box: model.number().default(1),
  boxes_per_pallet: model.number().nullable(),
  package_weight: model.number().nullable(),
  package_dimensions: model.text().nullable(),
});
