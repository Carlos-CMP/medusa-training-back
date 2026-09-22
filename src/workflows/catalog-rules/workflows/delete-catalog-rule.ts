import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { deleteCatalogRuleStep } from "../steps";

export const deleteCatalogRuleWorkflow = createWorkflow(
  "delete-catalog-rule",
  function (id: string) {
    return new WorkflowResponse(deleteCatalogRuleStep(id));
  }
);
