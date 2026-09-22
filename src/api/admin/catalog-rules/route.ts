import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { CATALOG_RULES_MODULE } from "../../../modules/catalog-rules";
import { upsertCatalogRuleWorkflow } from "../../../workflows/catalog-rules/workflows";
import { AdminUpsertCatalogRuleType } from "./validators";

const parseListParam = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(",")).filter(Boolean);
  }

  if (typeof value === "string" && value.length) {
    return value.split(",").filter(Boolean);
  }

  return undefined;
};

const buildFilters = (query: Record<string, unknown>) => {
  const filters: Record<string, unknown> = {};
  const simpleFields = [
    "id",
    "status",
    "rule_type",
    "target_type",
    "target_id",
    "company_id",
    "customer_group_id",
    "region_id",
    "sales_channel_id",
    "zone_code",
    "currency_code",
    "effect_type",
  ];

  for (const field of simpleFields) {
    const values = parseListParam(query[field]);

    if (values?.length) {
      filters[field] = values.length === 1 ? values[0] : values;
    }
  }

  return filters;
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const [catalog_rules, count] = await catalogRulesModule.listAndCountCatalogRules(
    buildFilters(req.query),
    {
      take: Number.isFinite(limit) ? limit : 50,
      skip: Number.isFinite(offset) ? offset : 0,
      order: {
        priority: "ASC",
        created_at: "DESC",
      },
    }
  );

  res.json({
    catalog_rules,
    count,
    limit,
    offset,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpsertCatalogRuleType>,
  res: MedusaResponse
) => {
  const { result } = await upsertCatalogRuleWorkflow.run({
    input: req.validatedBody,
    container: req.scope,
  });

  res.json({
    catalog_rule: result,
  });
};
