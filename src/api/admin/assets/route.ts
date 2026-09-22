import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ASSET_LIBRARY_MODULE } from "../../../modules/asset-library";
import { upsertAssetWorkflow } from "../../../workflows/asset-library/workflows";
import { DEFAULT_ASSETS } from "./defaults";
import { AdminUpsertAssetType } from "./validators";

const normalizeStringFilter = (value: unknown) => {
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }

  return typeof value === "string" ? value : "";
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const assetLibraryModule = req.scope.resolve<any>(ASSET_LIBRARY_MODULE);
  const clientProfileId = normalizeStringFilter(req.query.client_profile_id);
  const type = normalizeStringFilter(req.query.type);
  const isLogoPicker = type === "logo";

  const filters = {
    ...(clientProfileId && !isLogoPicker
      ? { client_profile_id: clientProfileId }
      : {}),
    ...(type ? { type } : {}),
  };

  const assets = await assetLibraryModule.listAssets(filters, {
    order: {
      sort_order: "ASC",
      created_at: "DESC",
    },
  });
  const defaultAssets = DEFAULT_ASSETS.filter((asset) => {
    const profileMatches =
      isLogoPicker ||
      !clientProfileId ||
      asset.client_profile_id === clientProfileId;
    const typeMatches = !type || asset.type === type;

    return profileMatches && typeMatches;
  });

  const customAssetKeys = new Set(
    assets.map((asset: any) => `${asset.type}:${asset.url}`)
  );

  res.json({
    assets: [
      ...assets,
      ...defaultAssets.filter(
        (asset) => !customAssetKeys.has(`${asset.type}:${asset.url}`)
      ),
    ],
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpsertAssetType>,
  res: MedusaResponse
) => {
  const { result } = await upsertAssetWorkflow.run({
    input: req.validatedBody,
    container: req.scope,
  });

  res.json({
    asset: result,
  });
};
