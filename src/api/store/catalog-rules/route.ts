import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { CATALOG_RULES_MODULE } from "../../../modules/catalog-rules";

type CatalogRuleRecord = {
  status: string;
  priority: number;
  target_type: string;
  target_id?: string | null;
  company_id?: string | null;
  customer_group_id?: string | null;
  region_id?: string | null;
  sales_channel_id?: string | null;
  zone_code?: string | null;
  currency_code?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  metadata?: Record<string, unknown> | string | null;
};

const firstQueryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : undefined;
  }

  return typeof value === "string" && value.length ? value : undefined;
};

const matchesScope = (
  ruleValue: string | null | undefined,
  contextValue: string | undefined
) => {
  return !ruleValue || ruleValue === contextValue;
};

const matchesTarget = (
  rule: CatalogRuleRecord,
  context: Record<string, string | undefined>
) => {
  if (rule.target_type === "all") {
    return true;
  }

  const contextValue = context[`${rule.target_type}_id`];

  return !!contextValue && rule.target_id === contextValue;
};

const isActiveInWindow = (rule: CatalogRuleRecord, now: Date) => {
  if (rule.status !== "active") {
    return false;
  }

  if (rule.starts_at && new Date(rule.starts_at) > now) {
    return false;
  }

  if (rule.ends_at && new Date(rule.ends_at) < now) {
    return false;
  }

  return true;
};

const parseMetadata = (rule: CatalogRuleRecord) => {
  if (!rule.metadata) {
    return rule;
  }

  if (typeof rule.metadata === "object") {
    return rule;
  }

  try {
    return {
      ...rule,
      metadata: JSON.parse(rule.metadata),
    };
  } catch {
    return rule;
  }
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const context = {
    product_id: firstQueryValue(req.query.product_id),
    variant_id: firstQueryValue(req.query.variant_id),
    category_id: firstQueryValue(req.query.category_id),
    collection_id: firstQueryValue(req.query.collection_id),
    company_id: firstQueryValue(req.query.company_id),
    customer_group_id: firstQueryValue(req.query.customer_group_id),
    region_id: firstQueryValue(req.query.region_id),
    sales_channel_id: firstQueryValue(req.query.sales_channel_id),
    zone_code: firstQueryValue(req.query.zone_code),
    currency_code: firstQueryValue(req.query.currency_code),
  };
  const now = new Date();
  const catalogRules = (await catalogRulesModule.listCatalogRules(
    {
      status: "active",
    },
    {
      order: {
        priority: "ASC",
        created_at: "DESC",
      },
    }
  )) as CatalogRuleRecord[];
  const applicable_rules = catalogRules
    .filter((rule) => isActiveInWindow(rule, now))
    .filter((rule) => matchesTarget(rule, context))
    .filter((rule) => matchesScope(rule.company_id, context.company_id))
    .filter((rule) =>
      matchesScope(rule.customer_group_id, context.customer_group_id)
    )
    .filter((rule) => matchesScope(rule.region_id, context.region_id))
    .filter((rule) =>
      matchesScope(rule.sales_channel_id, context.sales_channel_id)
    )
    .filter((rule) => matchesScope(rule.zone_code, context.zone_code))
    .filter((rule) => matchesScope(rule.currency_code, context.currency_code))
    .map(parseMetadata);

  res.json({
    context,
    applicable_rules,
  });
};
