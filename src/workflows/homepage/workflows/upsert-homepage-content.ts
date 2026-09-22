import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { HomepageContent } from "../../../modules/homepage/defaults";
import { upsertHomepageContentStep } from "../steps";

export const upsertHomepageContentWorkflow = createWorkflow(
  "upsert-homepage-content",
  function (input: HomepageContent) {
    return new WorkflowResponse(upsertHomepageContentStep(input));
  }
);
