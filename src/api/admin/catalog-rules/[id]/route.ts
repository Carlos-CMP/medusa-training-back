import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";
import { CATALOG_RULES_MODULE } from "../../../../modules/catalog-rules";
import { deleteCatalogRuleWorkflow } from "../../../../workflows/catalog-rules/workflows";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const catalogRule = await catalogRulesModule
    .retrieveCatalogRule(req.params.id)
    .catch(() => null);

  if (!catalogRule) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Catalog rule not found");
  }

  res.json({
    catalog_rule: catalogRule,
  });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await deleteCatalogRuleWorkflow.run({
    input: req.params.id,
    container: req.scope,
  });

  res.json(result);
};
