import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { BRAND_PROFILE_MODULE } from "../../../modules/brand-profile";
import {
  BrandProfileContent,
  DEFAULT_BRAND_PROFILE_CONTENT,
} from "../../../modules/brand-profile/defaults";
import { normalizeBrandProfileContent } from "../../../modules/brand-profile/normalize";
import { upsertBrandProfileContentWorkflow } from "../../../workflows/brand-profile/workflows";
import { AdminUpdateBrandProfileType } from "./validators";

const parseBrandProfileContent = (
  content?: string | null
): BrandProfileContent => {
  if (!content) {
    return normalizeBrandProfileContent(DEFAULT_BRAND_PROFILE_CONTENT);
  }

  try {
    return normalizeBrandProfileContent({
      ...DEFAULT_BRAND_PROFILE_CONTENT,
      ...JSON.parse(content),
    });
  } catch {
    return normalizeBrandProfileContent(DEFAULT_BRAND_PROFILE_CONTENT);
  }
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const brandProfileModule = req.scope.resolve<any>(BRAND_PROFILE_MODULE);
  const [config] = await brandProfileModule.listBrandProfileConfigs({
    key: "main",
  });

  res.json({
    brand_profile: parseBrandProfileContent(config?.content),
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateBrandProfileType>,
  res: MedusaResponse
) => {
  const normalizedInput = normalizeBrandProfileContent(req.validatedBody);

  const { result } = await upsertBrandProfileContentWorkflow.run({
    input: normalizedInput,
    container: req.scope,
  });

  res.json({
    brand_profile: parseBrandProfileContent(result.content),
  });
};
