import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { upsertCatalogRuleWorkflow } from "../../../../workflows/catalog-rules/workflows";
import { AdminBulkUpsertCatalogRulesType } from "../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminBulkUpsertCatalogRulesType>,
  res: MedusaResponse
) => {
  const catalog_rules: unknown[] = [];

  for (const rule of req.validatedBody.catalog_rules) {
    const { result } = await upsertCatalogRuleWorkflow.run({
      input: rule,
      container: req.scope,
    });

    catalog_rules.push(result);
  }

  res.json({
    catalog_rules,
  });
};
