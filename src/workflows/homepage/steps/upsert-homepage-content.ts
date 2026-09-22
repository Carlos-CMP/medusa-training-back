import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { HOMEPAGE_MODULE } from "../../../modules/homepage";
import { HomepageContent } from "../../../modules/homepage/defaults";

type HomepageConfigRecord = {
  id: string;
  key: string;
  content: string;
};

export const upsertHomepageContentStep = createStep(
  "upsert-homepage-content",
  async (input: HomepageContent, { container }) => {
    const homepageModule = container.resolve<any>(HOMEPAGE_MODULE);
    const [existing] = await homepageModule.listHomepageConfigs({
      key: "main",
    });
    const previousData = existing ? { ...existing } : null;

    const data = {
      key: "main",
      content: JSON.stringify(input),
    };

    const homepageConfig = existing
      ? await homepageModule.updateHomepageConfigs({
          id: existing.id,
          ...data,
        })
      : await homepageModule.createHomepageConfigs(data);

    return new StepResponse(homepageConfig, {
      createdId: existing ? null : homepageConfig.id,
      previousData,
    });
  },
  async (
    rollbackData: {
      createdId: string | null;
      previousData: HomepageConfigRecord | null;
    },
    { container }
  ) => {
    const homepageModule = container.resolve<any>(HOMEPAGE_MODULE);

    if (rollbackData.previousData) {
      await homepageModule.updateHomepageConfigs(rollbackData.previousData);
      return;
    }

    if (rollbackData.createdId) {
      await homepageModule.deleteHomepageConfigs([rollbackData.createdId]);
    }
  }
);
