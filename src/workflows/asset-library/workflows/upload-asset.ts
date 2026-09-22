import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  saveUploadedAssetFileStep,
  UploadAssetInput,
  upsertAssetStep,
} from "../steps";

export const uploadAssetWorkflow = createWorkflow(
  "upload-asset",
  function (input: UploadAssetInput) {
    const assetInput = saveUploadedAssetFileStep(input);
    const asset = upsertAssetStep(assetInput);

    return new WorkflowResponse(asset);
  }
);
