import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";
import { ASSET_LIBRARY_MODULE } from "../../../../modules/asset-library";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = String(req.params.id || "");
  const filename = String(req.params.filename || "");

  if (!/^asset_[a-z0-9]+$/i.test(id)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid asset id");
  }

  if (!/^[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid filename");
  }

  const assetLibraryModule = req.scope.resolve<any>(ASSET_LIBRARY_MODULE);
  const asset = await assetLibraryModule.retrieveAsset(id).catch(() => null);

  if (!asset?.content_base64 || asset.filename !== filename) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Asset file not found");
  }

  const buffer = Buffer.from(asset.content_base64, "base64");

  res.setHeader("Content-Type", asset.mime_type || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(buffer);
};
