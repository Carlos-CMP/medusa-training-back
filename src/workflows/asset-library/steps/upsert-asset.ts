import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ASSET_LIBRARY_MODULE } from "../../../modules/asset-library";

export type UpsertAssetInput = {
  id?: string;
  label: string;
  url: string;
  filename?: string | null;
  mime_type?: string | null;
  content_base64?: string | null;
  alt?: string | null;
  type:
    | "logo"
    | "hero"
    | "homepage"
    | "product"
    | "category"
    | "document"
    | "other";
  client_profile_id: string;
  tags?: string | null;
  sort_order?: number;
};

type AssetRecord = UpsertAssetInput & {
  id: string;
};

const getShaTag = (tags: string | null | undefined) =>
  (tags || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .find((tag) => tag.startsWith("sha1:"));

export const upsertAssetStep = createStep(
  "upsert-asset",
  async (input: UpsertAssetInput, { container }) => {
    const assetLibraryModule = container.resolve<any>(ASSET_LIBRARY_MODULE);
    const data = {
      ...input,
      filename: input.filename || null,
      mime_type: input.mime_type || null,
      content_base64: input.content_base64 || null,
      alt: input.alt || null,
      tags: input.tags || null,
      sort_order: input.sort_order || 0,
    };

    const existing = input.id
      ? await assetLibraryModule
          .retrieveAsset(input.id)
          .catch(() => null as AssetRecord | null)
      : null;

    if (!existing) {
      const currentAssets = await assetLibraryModule.listAssets({
        client_profile_id: data.client_profile_id,
        type: data.type,
      });
      const inputSha = getShaTag(data.tags);
      const duplicate = currentAssets.find((asset: AssetRecord) => {
        const sameHash = inputSha && getShaTag(asset.tags) === inputSha;

        return sameHash;
      });

      if (duplicate) {
        const shouldRefreshDuplicate = Boolean(
          data.content_base64 ||
            data.url !== duplicate.url ||
            data.filename !== duplicate.filename ||
            data.label !== duplicate.label ||
            data.type !== duplicate.type ||
            data.client_profile_id !== duplicate.client_profile_id
        );
        const asset = shouldRefreshDuplicate
          ? await assetLibraryModule.updateAssets({
              id: duplicate.id,
              ...data,
            })
          : duplicate;

        return new StepResponse(asset, {
          createdId: null,
          previousData: shouldRefreshDuplicate ? duplicate : null,
        });
      }
    }

    const asset = existing
      ? await assetLibraryModule.updateAssets({
          id: existing.id,
          ...data,
        })
      : await assetLibraryModule.createAssets(data);

    return new StepResponse(asset, {
      createdId: existing ? null : asset.id,
      previousData: existing,
    });
  },
  async (
    rollbackData: {
      createdId: string | null;
      previousData: AssetRecord | null;
    },
    { container }
  ) => {
    const assetLibraryModule = container.resolve<any>(ASSET_LIBRARY_MODULE);

    if (rollbackData.previousData) {
      await assetLibraryModule.updateAssets(rollbackData.previousData);
      return;
    }

    if (rollbackData.createdId) {
      await assetLibraryModule.deleteAssets([rollbackData.createdId]);
    }
  }
);
