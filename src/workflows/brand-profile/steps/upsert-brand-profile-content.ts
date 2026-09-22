import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { BRAND_PROFILE_MODULE } from "../../../modules/brand-profile";
import { BrandProfileContent } from "../../../modules/brand-profile/defaults";

type BrandProfileConfigRecord = {
  id: string;
  key: string;
  content: string;
};

export const upsertBrandProfileContentStep = createStep(
  "upsert-brand-profile-content",
  async (input: BrandProfileContent, { container }) => {
    const brandProfileModule = container.resolve<any>(BRAND_PROFILE_MODULE);
    const [existing] = await brandProfileModule.listBrandProfileConfigs({
      key: "main",
    });
    const previousData = existing ? { ...existing } : null;
    const data = {
      key: "main",
      content: JSON.stringify(input),
    };
    const brandProfileConfig = existing
      ? await brandProfileModule.updateBrandProfileConfigs({
          id: existing.id,
          ...data,
        })
      : await brandProfileModule.createBrandProfileConfigs(data);

    return new StepResponse(brandProfileConfig, {
      createdId: existing ? null : brandProfileConfig.id,
      previousData,
    });
  },
  async (
    rollbackData: {
      createdId: string | null;
      previousData: BrandProfileConfigRecord | null;
    },
    { container }
  ) => {
    const brandProfileModule = container.resolve<any>(BRAND_PROFILE_MODULE);

    if (rollbackData.previousData) {
      await brandProfileModule.updateBrandProfileConfigs(
        rollbackData.previousData
      );
      return;
    }

    if (rollbackData.createdId) {
      await brandProfileModule.deleteBrandProfileConfigs([
        rollbackData.createdId,
      ]);
    }
  }
);
