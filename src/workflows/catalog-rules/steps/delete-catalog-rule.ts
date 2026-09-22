import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { CATALOG_RULES_MODULE } from "../../../modules/catalog-rules";

export const deleteCatalogRuleStep = createStep(
  "delete-catalog-rule",
  async (id: string, { container }) => {
    const catalogRulesModule = container.resolve<any>(CATALOG_RULES_MODULE);
    const existing = await catalogRulesModule.retrieveCatalogRule(id);

    await catalogRulesModule.deleteCatalogRules([id]);

    return new StepResponse({ id }, existing);
  },
  async (previousData, { container }) => {
    const catalogRulesModule = container.resolve<any>(CATALOG_RULES_MODULE);

    if (previousData) {
      await catalogRulesModule.createCatalogRules(previousData);
    }
  }
);
