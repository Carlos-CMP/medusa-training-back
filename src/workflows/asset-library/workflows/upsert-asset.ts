import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { upsertAssetStep, UpsertAssetInput } from "../steps";

export const upsertAssetWorkflow = createWorkflow(
  "upsert-asset",
  function (input: UpsertAssetInput) {
    return new WorkflowResponse(upsertAssetStep(input));
  }
);
