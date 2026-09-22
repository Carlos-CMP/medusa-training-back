import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  upsertProductPackagingStep,
  UpsertProductPackagingInput,
} from "../steps";

export const upsertProductPackagingWorkflow = createWorkflow(
  "upsert-product-packaging",
  function (input: UpsertProductPackagingInput) {
    return new WorkflowResponse(upsertProductPackagingStep(input));
  }
);
