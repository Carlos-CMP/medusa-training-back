import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ASSET_LIBRARY_MODULE } from "../../../modules/asset-library";

type DeleteAssetInput = {
  id: string;
};

export const deleteAssetStep = createStep(
  "delete-asset",
  async (input: DeleteAssetInput, { container }) => {
    const assetLibraryModule = container.resolve<any>(ASSET_LIBRARY_MODULE);
    const existing = await assetLibraryModule
      .retrieveAsset(input.id)
      .catch(() => null);

    if (!existing) {
      return new StepResponse({ id: input.id, missing: true }, null);
    }

    await assetLibraryModule.deleteAssets([input.id]);

    return new StepResponse({ id: input.id }, existing);
  },
  async (existing, { container }) => {
    if (!existing) {
      return;
    }

    const assetLibraryModule = container.resolve<any>(ASSET_LIBRARY_MODULE);
    await assetLibraryModule.createAssets(existing);
  }
);
