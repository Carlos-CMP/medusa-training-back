import { z } from "@medusajs/framework/zod";

export const AdminUpsertProductPackaging = z.object({
  variant_id: z.string().min(1),
  sales_unit: z.enum(["unit", "box"]).default("unit"),
  minimum_order_quantity: z.number().int().positive().default(1),
  quantity_increment: z.number().int().positive().default(1),
  units_per_box: z.number().int().positive().default(1),
  boxes_per_pallet: z.number().int().positive().nullable().optional(),
  package_weight: z.number().positive().nullable().optional(),
  package_dimensions: z.string().nullable().optional(),
});

export type AdminUpsertProductPackagingType = z.infer<
  typeof AdminUpsertProductPackaging
>;

export const AdminBulkUpsertProductPackaging = z.object({
  packaging: z.array(AdminUpsertProductPackaging).min(1),
});

export type AdminBulkUpsertProductPackagingType = z.infer<
  typeof AdminBulkUpsertProductPackaging
>;
