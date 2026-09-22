import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { uploadAssetWorkflow } from "../../../../workflows/asset-library/workflows";
import { AdminUploadAssetType } from "../validators";

const getPublicBaseUrl = (req: AuthenticatedMedusaRequest) => {
  if (process.env.MEDUSA_BACKEND_URL) {
    return process.env.MEDUSA_BACKEND_URL;
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host;
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || "http";

  return `${protocol}://${host}`;
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUploadAssetType>,
  res: MedusaResponse
) => {
  const { result } = await uploadAssetWorkflow.run({
    input: {
      ...req.validatedBody,
      public_base_url: getPublicBaseUrl(req),
    },
    container: req.scope,
  });

  res.json({
    asset: result,
  });
};
