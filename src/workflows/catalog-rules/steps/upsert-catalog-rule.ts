import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { CATALOG_RULES_MODULE } from "../../../modules/catalog-rules";

export type CatalogRuleStatus = "draft" | "active" | "archived";
export type CatalogRuleType = "price" | "visibility" | "assortment" | "quote";
export type CatalogRuleTargetType =
  | "all"
  | "product"
  | "variant"
  | "category"
  | "collection";
export type CatalogRuleEffectType =
  | "discount_percentage"
  | "fixed_price"
  | "hide"
  | "show_only"
  | "requires_quote";

export type UpsertCatalogRuleInput = {
  id?: string;
  name: string;
  description?: string | null;
  status?: CatalogRuleStatus;
  priority?: number;
  rule_type?: CatalogRuleType;
  target_type?: CatalogRuleTargetType;
  target_id?: string | null;
  company_id?: string | null;
  customer_group_id?: string | null;
  region_id?: string | null;
  sales_channel_id?: string | null;
  zone_code?: string | null;
  currency_code?: string | null;
  effect_type?: CatalogRuleEffectType;
  discount_percentage?: number | null;
  fixed_price?: number | null;
  minimum_quantity?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CatalogRuleRecord = UpsertCatalogRuleInput & {
  id: string;
};

export const upsertCatalogRuleStep = createStep(
  "upsert-catalog-rule",
  async (input: UpsertCatalogRuleInput, { container }) => {
    const catalogRulesModule = container.resolve<any>(CATALOG_RULES_MODULE);
    const existing = input.id
      ? await catalogRulesModule.retrieveCatalogRule(input.id).catch(() => null)
      : null;
    const previousData = existing ? { ...existing } : null;
    const data = {
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "draft",
      priority: input.priority ?? 100,
      rule_type: input.rule_type ?? "price",
      target_type: input.target_type ?? "all",
      target_id: input.target_id ?? null,
      company_id: input.company_id ?? null,
      customer_group_id: input.customer_group_id ?? null,
      region_id: input.region_id ?? null,
      sales_channel_id: input.sales_channel_id ?? null,
      zone_code: input.zone_code ?? null,
      currency_code: input.currency_code ?? null,
      effect_type: input.effect_type ?? "discount_percentage",
      discount_percentage: input.discount_percentage ?? null,
      fixed_price: input.fixed_price ?? null,
      minimum_quantity: input.minimum_quantity ?? 1,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      metadata: input.metadata ?? null,
    };

    const catalogRule = existing
      ? await catalogRulesModule.updateCatalogRules({
          id: existing.id,
          ...data,
        })
      : await catalogRulesModule.createCatalogRules(data);

    return new StepResponse(catalogRule, {
      createdId: existing ? null : catalogRule.id,
      previousData,
    });
  },
  async (
    rollbackData: {
      createdId: string | null;
      previousData: CatalogRuleRecord | null;
    },
    { container }
  ) => {
    const catalogRulesModule = container.resolve<any>(CATALOG_RULES_MODULE);

    if (rollbackData.previousData) {
      await catalogRulesModule.updateCatalogRules(rollbackData.previousData);
      return;
    }

    if (rollbackData.createdId) {
      await catalogRulesModule.deleteCatalogRules([rollbackData.createdId]);
    }
  }
);
