import { z } from "@medusajs/framework/zod";

const nullableString = z.string().min(1).nullable().optional();

export const AdminUpsertCatalogRule = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    priority: z.number().int().default(100),
    rule_type: z
      .enum(["price", "visibility", "assortment", "quote"])
      .default("price"),
    target_type: z
      .enum(["all", "product", "variant", "category", "collection"])
      .default("all"),
    target_id: nullableString,
    company_id: nullableString,
    customer_group_id: nullableString,
    region_id: nullableString,
    sales_channel_id: nullableString,
    zone_code: nullableString,
    currency_code: nullableString,
    effect_type: z
      .enum([
        "discount_percentage",
        "fixed_price",
        "hide",
        "show_only",
        "requires_quote",
      ])
      .default("discount_percentage"),
    discount_percentage: z.number().min(0).max(100).nullable().optional(),
    fixed_price: z.number().min(0).nullable().optional(),
    minimum_quantity: z.number().int().positive().default(1),
    starts_at: nullableString,
    ends_at: nullableString,
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.effect_type === "discount_percentage" && value.discount_percentage === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_percentage"],
        message: "discount_percentage is required for discount rules",
      });
    }

    if (value.effect_type === "fixed_price" && value.fixed_price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixed_price"],
        message: "fixed_price is required for fixed price rules",
      });
    }
  });

export type AdminUpsertCatalogRuleType = z.infer<
  typeof AdminUpsertCatalogRule
>;

export const AdminBulkUpsertCatalogRules = z.object({
  catalog_rules: z.array(AdminUpsertCatalogRule).min(1),
});

export type AdminBulkUpsertCatalogRulesType = z.infer<
  typeof AdminBulkUpsertCatalogRules
>;

export const AdminSyncCatalogRulePriceList = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export type AdminSyncCatalogRulePriceListType = z.infer<
  typeof AdminSyncCatalogRulePriceList
>;
