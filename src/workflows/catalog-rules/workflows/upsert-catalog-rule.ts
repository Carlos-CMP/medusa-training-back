import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { upsertCatalogRuleStep, UpsertCatalogRuleInput } from "../steps";

export const upsertCatalogRuleWorkflow = createWorkflow(
  "upsert-catalog-rule",
  function (input: UpsertCatalogRuleInput) {
    return new WorkflowResponse(upsertCatalogRuleStep(input));
  }
);
