import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { BrandProfileContent } from "../../../modules/brand-profile/defaults";
import { upsertBrandProfileContentStep } from "../steps";

export const upsertBrandProfileContentWorkflow = createWorkflow(
  "upsert-brand-profile-content",
  function (input: BrandProfileContent) {
    return new WorkflowResponse(upsertBrandProfileContentStep(input));
  }
);
