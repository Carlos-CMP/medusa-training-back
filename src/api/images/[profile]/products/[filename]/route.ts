import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { proxyStorefrontImage } from "../../../../../utils/proxy-storefront-image";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const profile = String(req.params.profile || "");
  const filename = String(req.params.filename || "");

  await proxyStorefrontImage(req, res, [profile, "products", filename]);
};
