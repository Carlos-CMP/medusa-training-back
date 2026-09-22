import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  MedusaError,
  PriceListStatus,
  PriceListType,
} from "@medusajs/framework/utils";
import { createPriceListsWorkflow } from "@medusajs/core-flows";
import { CATALOG_RULES_MODULE } from "../../../../../modules/catalog-rules";
import { upsertCatalogRuleWorkflow } from "../../../../../workflows/catalog-rules/workflows";
import { AdminSyncCatalogRulePriceListType } from "../../validators";

type CatalogRuleMetadata = Record<string, unknown>;

const parseMetadata = (metadata: unknown): CatalogRuleMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as CatalogRuleMetadata)
    : {};
};

const validateSyncableRule = (rule: any, metadata: CatalogRuleMetadata) => {
  const errors: string[] = [];

  if (metadata.price_list_id) {
    errors.push("it is already synced to a Medusa price list");
  }

  if (rule.status !== "active") {
    errors.push("status must be active");
  }

  if (rule.rule_type !== "price") {
    errors.push("rule_type must be price");
  }

  if (rule.effect_type !== "fixed_price") {
    errors.push("effect_type must be fixed_price");
  }

  if (rule.target_type !== "variant") {
    errors.push("target_type must be variant");
  }

  if (!rule.target_id) {
    errors.push("target_id must be a variant id");
  }

  if (rule.fixed_price === null || rule.fixed_price === undefined) {
    errors.push("fixed_price is required");
  }

  if (!rule.currency_code) {
    errors.push("currency_code is required");
  }

  if (errors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Catalog rule cannot be synced: ${errors.join(", ")}.`
    );
  }
};

const buildPriceListRules = (rule: any) => {
  const rules: Record<string, string[]> = {};

  if (rule.customer_group_id) {
    rules.customer_group_id = [rule.customer_group_id];
  }

  if (rule.region_id) {
    rules.region_id = [rule.region_id];
  }

  return Object.keys(rules).length ? rules : undefined;
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSyncCatalogRulePriceListType>,
  res: MedusaResponse
) => {
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const catalogRule = await catalogRulesModule
    .retrieveCatalogRule(req.params.id)
    .catch(() => null);

  if (!catalogRule) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Catalog rule ${req.params.id} was not found`
    );
  }

  const metadata = parseMetadata(catalogRule.metadata);
  validateSyncableRule(catalogRule, metadata);

  const priceListData = {
    title:
      req.validatedBody.title ||
      `[B2B] ${catalogRule.name} (${catalogRule.currency_code})`,
    description:
      req.validatedBody.description ||
      `Generated from B2B catalog rule ${catalogRule.id}`,
    starts_at: catalogRule.starts_at || undefined,
    ends_at: catalogRule.ends_at || undefined,
    status: PriceListStatus.ACTIVE,
    type: PriceListType.OVERRIDE,
    rules: buildPriceListRules(catalogRule),
    prices: [
      {
        variant_id: catalogRule.target_id,
        currency_code: catalogRule.currency_code,
        amount: Number(catalogRule.fixed_price),
        min_quantity:
          Number(catalogRule.minimum_quantity || 1) > 1
            ? Number(catalogRule.minimum_quantity)
            : null,
      },
    ],
    metadata: {
      source: "b2b_catalog_rule",
      catalog_rule_id: catalogRule.id,
      company_id: catalogRule.company_id,
      sales_channel_id: catalogRule.sales_channel_id,
      zone_code: catalogRule.zone_code,
    },
  };

  let priceList: any;

  try {
    const { result: priceLists } = await createPriceListsWorkflow(req.scope).run({
      input: {
        price_lists_data: [priceListData],
      },
    });
    priceList = priceLists[0];
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Could not create Medusa price list: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let updatedCatalogRule: any;

  try {
    const { result } = await upsertCatalogRuleWorkflow.run({
      input: {
        ...catalogRule,
        metadata: {
          ...metadata,
          price_list_id: priceList.id,
          price_list_synced_at: new Date().toISOString(),
          price_list_sync_mode: "fixed_price_variant",
        },
      },
      container: req.scope,
    });
    updatedCatalogRule = result;
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Price list ${priceList.id} was created, but catalog rule metadata could not be updated: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  res.json({
    catalog_rule: updatedCatalogRule,
    price_list: priceList,
    synced: true,
  });
};
