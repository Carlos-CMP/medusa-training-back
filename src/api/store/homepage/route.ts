import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { HOMEPAGE_MODULE } from "../../../modules/homepage";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HomepageContent,
} from "../../../modules/homepage/defaults";

const parseHomepageContent = (content?: string | null): HomepageContent => {
  if (!content) {
    return DEFAULT_HOMEPAGE_CONTENT;
  }

  try {
    return {
      ...DEFAULT_HOMEPAGE_CONTENT,
      ...JSON.parse(content),
    };
  } catch {
    return DEFAULT_HOMEPAGE_CONTENT;
  }
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const homepageModule = req.scope.resolve<any>(HOMEPAGE_MODULE);
  const [config] = await homepageModule.listHomepageConfigs({ key: "main" });

  res.json({
    homepage: parseHomepageContent(config?.content),
  });
};
