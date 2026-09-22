import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { deleteAssetStep } from "../steps";

export const deleteAssetWorkflow = createWorkflow(
  "delete-asset",
  function (input: { id: string }) {
    return new WorkflowResponse(deleteAssetStep(input));
  }
);
